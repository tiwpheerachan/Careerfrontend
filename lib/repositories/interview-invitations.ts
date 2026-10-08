import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import {
  applicationForms,
  applications,
  interviewEvaluations,
  interviewInvitations,
  interviewInvitees,
  type InterviewInvitationRow,
} from '@/lib/db/schema';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import type { CandidateRef } from '@/lib/interview/candidate-key';
import { expiresAt, newToken, stateOf, type InvitationState } from '@/lib/interview/invitations';
import type { GuestEvaluationInput, InvitationInput } from '@/lib/interview/schema';
import { outcomeOf } from '@/lib/interview/scoring';
import { isUuid } from './support';

export interface Invitee {
  id: string;
  email: string;
  name: string | null;
  jobTitle: string | null;
  department: string | null;
  openedAt: Date | null;
  submittedAt: Date | null;
}

export interface Invitation {
  id: string;
  token: string;
  candidate: {
    kind: 'application' | 'form' | 'manual';
    id: string | null;
    name: string;
    position: string | null;
    department: string | null;
  };
  round: 1 | 2;
  evaluatorRole: InterviewInvitationRow['evaluatorRole'];
  senior: boolean;
  /** An edit link: the evaluation it changes (its evaluator is the one invitee); null for a new one. */
  editOf: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: Date;
  openedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  state: InvitationState;
  invitees: Invitee[];
}

/** Interview invitations — migration 0007, rules in lib/interview/invitations.ts. */
export function createInterviewInvitationRepository(db: Database) {
  const joined = () =>
    db
      .select({
        row: interviewInvitations,
        applicationId: applications.id,
        applicationFormId: applicationForms.id,
        evaluationId: interviewEvaluations.id,
      })
      .from(interviewInvitations)
      .leftJoin(applications, eq(applications.pk, interviewInvitations.applicationsPk))
      .leftJoin(applicationForms, eq(applicationForms.pk, interviewInvitations.applicationFormsPk))
      .leftJoin(interviewEvaluations, eq(interviewEvaluations.pk, interviewInvitations.evaluationsPk));

  async function withInvitees(
    rows: Array<{
      row: InterviewInvitationRow;
      applicationId: string | null;
      applicationFormId: string | null;
      evaluationId: string | null;
    }>,
    now: Date,
  ): Promise<Invitation[]> {
    if (!rows.length) return [];
    const people = await db
      .select()
      .from(interviewInvitees)
      .where(
        inArray(
          interviewInvitees.invitationsPk,
          rows.map((r) => r.row.pk),
        ),
      )
      .orderBy(asc(interviewInvitees.pk));
    return rows.map(({ row, applicationId, applicationFormId, evaluationId }) => {
      const mine = people.filter((p) => p.invitationsPk === row.pk);
      const invitees = mine.map((p) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        jobTitle: p.jobTitle,
        department: p.department,
        openedAt: p.openedAt,
        submittedAt: p.submittedAt,
      }));
      return {
        id: row.id,
        token: row.token,
        candidate: {
          kind: applicationId ? 'application' : applicationFormId ? 'form' : 'manual',
          id: applicationId ?? applicationFormId ?? null,
          name: row.candidateName,
          position: row.position,
          department: row.department,
        },
        round: row.round as 1 | 2,
        evaluatorRole: row.evaluatorRole,
        senior: row.senior,
        editOf: evaluationId,
        createdBy: row.createdBy,
        createdByName: row.createdByName,
        createdAt: row.createdAt,
        openedAt: row.openedAt,
        revokedAt: row.revokedAt,
        expiresAt: expiresAt(row),
        state: stateOf(
          {
            createdAt: row.createdAt,
            openedAt: row.openedAt,
            revokedAt: row.revokedAt,
            invitees: invitees.length,
            submitted: invitees.filter((p) => p.submittedAt).length,
          },
          now,
        ),
        invitees,
      };
    });
  }

  async function pkOfLink(input: InvitationInput) {
    let applicationsPk: number | null = null;
    let applicationFormsPk: number | null = null;
    if (input.applicationId) {
      const [row] = await db
        .select({ pk: applications.pk })
        .from(applications)
        .where(eq(applications.id, input.applicationId));
      if (!row) throw new BadRequestError('No such applicant.', [{ path: 'applicationId', message: 'not found' }]);
      applicationsPk = row.pk;
    }
    if (input.applicationFormId) {
      const [row] = await db
        .select({ pk: applicationForms.pk })
        .from(applicationForms)
        .where(eq(applicationForms.id, input.applicationFormId));
      if (!row)
        throw new BadRequestError('No such application form.', [{ path: 'applicationFormId', message: 'not found' }]);
      applicationFormsPk = row.pk;
    }
    return { applicationsPk, applicationFormsPk };
  }

  async function byToken(token: string, now = new Date()): Promise<Invitation | undefined> {
    if (!/^[A-Za-z0-9_-]{32,100}$/.test(token)) return undefined;
    const rows = await joined().where(eq(interviewInvitations.token, token)).limit(1);
    return (await withInvitees(rows, now))[0];
  }

  return {
    byToken,

    async create(
      input: InvitationInput,
      createdBy: string,
      now = new Date(),
      createdByName: string | null = null,
    ): Promise<Invitation> {
      const links = await pkOfLink(input);
      const token = newToken();
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(interviewInvitations)
          .values({
            token,
            ...links,
            candidateName: input.candidateName,
            position: input.position,
            department: input.department,
            round: input.round,
            evaluatorRole: input.evaluatorRole,
            senior: input.senior,
            createdBy,
            createdByName,
            createdAt: now,
          })
          .returning({ pk: interviewInvitations.pk });
        await tx.insert(interviewInvitees).values(input.invitees.map((p) => ({ ...p, invitationsPk: row!.pk })));
      });
      return (await byToken(token, now))!;
    },

    /**
     * An edit link for one evaluation: its candidate, round and side, and its
     * evaluator as the only one on it. The same rules as an invitation (24
     * hours unopened, 6 once opened, sent once); sending changes the evaluation.
     */
    async createEditLink(
      evaluationId: string,
      createdBy: string,
      now = new Date(),
      createdByName: string | null = null,
    ): Promise<Invitation> {
      if (!isUuid(evaluationId)) throw new NotFoundError('interview evaluation', evaluationId);
      const [evaluation] = await db
        .select()
        .from(interviewEvaluations)
        .where(and(eq(interviewEvaluations.id, evaluationId), ne(interviewEvaluations.status, 'DELETED')))
        .limit(1);
      if (!evaluation) throw new NotFoundError('interview evaluation', evaluationId);
      const token = newToken();
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(interviewInvitations)
          .values({
            token,
            applicationsPk: evaluation.applicationsPk,
            applicationFormsPk: evaluation.applicationFormsPk,
            candidateName: evaluation.candidateName,
            position: evaluation.position,
            department: evaluation.department,
            round: evaluation.round,
            evaluatorRole: evaluation.evaluatorRole,
            senior: evaluation.senior,
            evaluationsPk: evaluation.pk,
            createdBy,
            createdByName,
            createdAt: now,
          })
          .returning({ pk: interviewInvitations.pk });
        await tx.insert(interviewInvitees).values({
          invitationsPk: row!.pk,
          email: evaluation.evaluatorEmail,
          name: evaluation.evaluatorName,
        });
      });
      return (await byToken(token, now))!;
    },

    /** Every invitation for one candidate, newest first. */
    async forCandidate(ref: CandidateRef, now = new Date()): Promise<Invitation[]> {
      const who =
        ref.kind === 'application'
          ? eq(applications.id, ref.id)
          : ref.kind === 'form'
            ? eq(applicationForms.id, ref.id)
            : and(
                isNull(interviewInvitations.applicationsPk),
                isNull(interviewInvitations.applicationFormsPk),
                sql`lower(btrim(${interviewInvitations.candidateName})) = lower(btrim(${ref.name}))`,
              );
      const rows = await joined().where(who).orderBy(desc(interviewInvitations.createdAt));
      return withInvitees(rows, now);
    },

    /**
     * The first time someone on it opens it: the 6 hours start (once), and
     * their own first visit is noted. (The time goes in as text: postgres.js
     * cannot bind a Date inside a raw sql fragment.)
     */
    async markOpened(token: string, email: string, now = new Date()): Promise<void> {
      const [inv] = await db
        .update(interviewInvitations)
        .set({ openedAt: sql`coalesce(${interviewInvitations.openedAt}, ${now.toISOString()}::timestamptz)` })
        .where(eq(interviewInvitations.token, token))
        .returning({ pk: interviewInvitations.pk });
      if (!inv) return;
      await db
        .update(interviewInvitees)
        .set({ openedAt: sql`coalesce(${interviewInvitees.openedAt}, ${now.toISOString()}::timestamptz)` })
        .where(
          and(eq(interviewInvitees.invitationsPk, inv.pk), sql`lower(${interviewInvitees.email}) = lower(${email})`),
        );
    },

    /**
     * One invitee's evaluation: saved — or, through an edit link, the
     * evaluation it is for changed (and marked edited) — and their part of the
     * link closed, in one transaction. A second send (a double click, another
     * tab) is a 409 and saves nothing.
     */
    async submit(
      token: string,
      evaluator: { email: string; name: string | null },
      input: GuestEvaluationInput,
    ): Promise<{ evaluationId: string }> {
      return db.transaction(async (tx) => {
        const [inv] = await tx
          .select()
          .from(interviewInvitations)
          .where(eq(interviewInvitations.token, token))
          .limit(1);
        if (!inv) throw new NotFoundError('invitation', 'token');
        if (input.senior !== inv.senior) {
          throw new BadRequestError('The invitation decides whether items 11–15 are scored.', [
            { path: 'senior', message: inv.senior ? 'score items 11–15 too' : 'items 11–15 are not scored' },
          ]);
        }
        const outcome = outcomeOf({ general: input.generalScores, senior: input.senior ? input.seniorScores : null });
        const verdict = {
          senior: input.senior,
          generalScores: input.generalScores,
          seniorScores: input.senior ? input.seniorScores : null,
          generalTotal: outcome.generalTotal,
          seniorTotal: outcome.seniorTotal,
          result: input.result,
          failReason: input.result === 'FAIL' ? input.failReason : null,
          comment: input.comment,
        };
        const [evaluation] = inv.evaluationsPk
          ? await tx
              .update(interviewEvaluations)
              .set({ ...verdict, editedBy: evaluator.email, editedAt: new Date() })
              .where(and(eq(interviewEvaluations.pk, inv.evaluationsPk), ne(interviewEvaluations.status, 'DELETED')))
              .returning({ pk: interviewEvaluations.pk, id: interviewEvaluations.id })
          : await tx
              .insert(interviewEvaluations)
              .values({
                applicationsPk: inv.applicationsPk,
                applicationFormsPk: inv.applicationFormsPk,
                candidateName: inv.candidateName,
                position: inv.position,
                department: inv.department,
                interviewDate: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date()),
                round: inv.round,
                evaluatorRole: inv.evaluatorRole,
                evaluatorEmail: evaluator.email,
                evaluatorName: evaluator.name,
                ...verdict,
                invitationsPk: inv.pk,
              })
              .returning({ pk: interviewEvaluations.pk, id: interviewEvaluations.id });
        // The evaluation an edit link is for was deleted since.
        if (!evaluation) throw new NotFoundError('interview evaluation', 'of this link');
        const [closed] = await tx
          .update(interviewInvitees)
          .set({ submittedAt: new Date(), evaluationsPk: evaluation!.pk })
          .where(
            and(
              eq(interviewInvitees.invitationsPk, inv.pk),
              sql`lower(${interviewInvitees.email}) = lower(${evaluator.email})`,
              isNull(interviewInvitees.submittedAt),
            ),
          )
          .returning({ pk: interviewInvitees.pk });
        if (!closed) throw new ConflictError('You have already sent your evaluation through this link.');
        return { evaluationId: evaluation!.id };
      });
    },

    async revoke(id: string, actor: string): Promise<void> {
      if (!isUuid(id)) throw new NotFoundError('invitation', id);
      const [row] = await db
        .update(interviewInvitations)
        .set({ revokedAt: new Date(), revokedBy: actor })
        .where(and(eq(interviewInvitations.id, id), isNull(interviewInvitations.revokedAt)))
        .returning({ id: interviewInvitations.id });
      if (!row) throw new NotFoundError('invitation', id);
    },
  };
}

export type InterviewInvitationRepository = ReturnType<typeof createInterviewInvitationRepository>;
