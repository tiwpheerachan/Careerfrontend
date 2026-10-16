import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import {
  applicationForms,
  applications,
  interviewCandidates,
  interviewEvaluations,
  interviewInvitations,
} from '@/lib/db/schema';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import type { InterviewCandidateInput, InterviewCandidateLinkInput } from '@/lib/interview/schema';
import { isUuid } from './support';

/** A candidate HR added before they had an application, as the admin shows them. */
export interface PendingCandidate {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  /** HR's only — never on an invitee's page. */
  phone: string | null;
  /** The résumé HR attached, if any (its name). */
  resumeName: string | null;
  /** What it was linked to, once it was: then the application or form is the candidate. */
  linkedTo: { kind: 'application' | 'form'; id: string } | null;
  createdBy: string;
  createdAt: Date;
}

/**
 * Candidates HR adds before they have an application — migration 0013. They
 * are invited and evaluated like anyone else (interview_evaluations and
 * interview_invitations carry interview_candidates_pk); once the application
 * or form exists, link() hands every one of those to it.
 */
export function createInterviewCandidateRepository(db: Database) {
  const live = ne(interviewCandidates.status, 'DELETED');

  async function row(id: string) {
    if (!isUuid(id)) throw new NotFoundError('candidate', id);
    const [found] = await db
      .select({
        candidate: interviewCandidates,
        linkedApplicationId: applications.id,
        linkedApplicationFormId: applicationForms.id,
      })
      .from(interviewCandidates)
      .leftJoin(applications, eq(applications.pk, interviewCandidates.linkedApplicationsPk))
      .leftJoin(applicationForms, eq(applicationForms.pk, interviewCandidates.linkedApplicationFormsPk))
      .where(and(live, eq(interviewCandidates.id, id)))
      .limit(1);
    if (!found) throw new NotFoundError('candidate', id);
    return found;
  }

  return {
    async create(
      input: InterviewCandidateInput & { resume?: { path: string; name: string; type: string } | null },
      actor: { email: string; name: string | null },
    ): Promise<{ id: string }> {
      const [created] = await db
        .insert(interviewCandidates)
        .values({
          name: input.name,
          position: input.position,
          department: input.department,
          phone: input.phone,
          resumePath: input.resume?.path ?? null,
          resumeName: input.resume?.name ?? null,
          resumeType: input.resume?.type ?? null,
          createdBy: actor.email,
          createdByName: actor.name,
        })
        .returning({ id: interviewCandidates.id });
      return created!;
    },

    /** One candidate; 404 when deleted or unknown. */
    async get(id: string): Promise<PendingCandidate> {
      const { candidate: c, linkedApplicationId, linkedApplicationFormId } = await row(id);
      return {
        id: c.id,
        name: c.name,
        position: c.position,
        department: c.department,
        phone: c.phone,
        resumeName: c.resumeName,
        linkedTo: linkedApplicationId
          ? { kind: 'application', id: linkedApplicationId }
          : linkedApplicationFormId
            ? { kind: 'form', id: linkedApplicationFormId }
            : null,
        createdBy: c.createdBy,
        createdAt: c.createdAt,
      };
    },

    /** The résumé HR attached; 404 when the candidate, or its résumé, is not there. */
    async resume(id: string): Promise<{ path: string; name: string; type: string }> {
      const { candidate: c } = await row(id);
      if (!c.resumePath || !c.resumeName || !c.resumeType) throw new NotFoundError('résumé', id);
      return { path: c.resumePath, name: c.resumeName, type: c.resumeType };
    },

    /**
     * Link to the application or form once it exists: every evaluation and
     * invitation of this candidate becomes the application's or form's, in one
     * transaction. Once only (409 after). 409 too when someone has evaluated
     * the same round and side of both — one evaluation per evaluator, round and
     * side is the rule; HR deletes one first.
     */
    async link(
      id: string,
      target: InterviewCandidateLinkInput,
      actor: string,
    ): Promise<{ kind: 'application' | 'form'; id: string }> {
      return db.transaction(async (tx) => {
        if (!isUuid(id)) throw new NotFoundError('candidate', id);
        const [c] = await tx
          .select()
          .from(interviewCandidates)
          .where(and(live, eq(interviewCandidates.id, id)))
          .for('update')
          .limit(1);
        if (!c) throw new NotFoundError('candidate', id);
        if (c.linkedAt) throw new ConflictError('This candidate is already linked to an application or form.');

        const kind = target.applicationId ? 'application' : 'form';
        const targetId = (target.applicationId ?? target.applicationFormId)!;
        const table = kind === 'application' ? applications : applicationForms;
        const [linked] = await tx
          .select({ pk: table.pk })
          .from(table)
          .where(and(eq(table.id, targetId), ne(table.status, 'DELETED')))
          .limit(1);
        if (!linked) {
          const path = kind === 'application' ? 'applicationId' : 'applicationFormId';
          throw new BadRequestError('No such application or form.', [{ path, message: 'not found' }]);
        }
        const targetColumn =
          kind === 'application' ? interviewEvaluations.applicationsPk : interviewEvaluations.applicationFormsPk;

        // The same evaluator, round and side on both: the rule is one each.
        const clash = await tx
          .select({ email: interviewEvaluations.evaluatorEmail })
          .from(interviewEvaluations)
          .where(
            and(
              ne(interviewEvaluations.status, 'DELETED'),
              eq(interviewEvaluations.interviewCandidatesPk, c.pk),
              isNull(interviewEvaluations.applicationsPk),
              isNull(interviewEvaluations.applicationFormsPk),
              sql`exists (
                select 1 from ${interviewEvaluations} other
                where other.status <> 'DELETED'
                  and other.${sql.identifier(targetColumn.name)} = ${linked.pk}
                  and other.round = ${interviewEvaluations.round}
                  and other.evaluator_role = ${interviewEvaluations.evaluatorRole}
                  and lower(other.evaluator_email) = lower(${interviewEvaluations.evaluatorEmail})
              )`,
            ),
          )
          .limit(1);
        if (clash.length) {
          throw new ConflictError(
            `${clash[0]!.email} has evaluated the same round of both — delete one of the two evaluations, then link.`,
          );
        }

        const link = kind === 'application' ? { applicationsPk: linked.pk } : { applicationFormsPk: linked.pk };
        await tx
          .update(interviewEvaluations)
          .set(link)
          .where(
            and(
              eq(interviewEvaluations.interviewCandidatesPk, c.pk),
              isNull(interviewEvaluations.applicationsPk),
              isNull(interviewEvaluations.applicationFormsPk),
            ),
          );
        await tx
          .update(interviewInvitations)
          .set(link)
          .where(
            and(
              eq(interviewInvitations.interviewCandidatesPk, c.pk),
              isNull(interviewInvitations.applicationsPk),
              isNull(interviewInvitations.applicationFormsPk),
            ),
          );
        await tx
          .update(interviewCandidates)
          .set({
            ...(kind === 'application' ? { linkedApplicationsPk: linked.pk } : { linkedApplicationFormsPk: linked.pk }),
            linkedAt: new Date(),
            linkedBy: actor,
          })
          .where(eq(interviewCandidates.pk, c.pk));
        return { kind, id: targetId };
      });
    },
  };
}

export type InterviewCandidateRepository = ReturnType<typeof createInterviewCandidateRepository>;
