import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import {
  applicationForms,
  applications,
  interviewEvaluations,
  jobs,
  type InterviewEvaluationRow,
} from '@/lib/db/schema';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { candidateKey, type CandidateRef } from '@/lib/interview/candidate-key';
import type { InterviewEvaluationInput } from '@/lib/interview/schema';
import { outcomeOf, type Outcome } from '@/lib/interview/scoring';
import { jobTitle } from './applications';
import { isUuid, likePattern, offsetOf, type Page } from './support';

/** Someone who can be evaluated: an application, or an application form. */
export interface Candidate {
  kind: 'application' | 'form';
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  email: string;
  createdAt: Date;
  /** Their evaluations so far (by anyone), round 1 first: shown on picking them, and to suggest the round. */
  evaluated: PastEvaluation[];
}

export interface PastEvaluation {
  round: 1 | 2;
  evaluatorRole: InterviewEvaluationRow['evaluatorRole'];
  /** The evaluator's name, or their email when there is none. */
  evaluator: string;
  interviewDate: string;
}

/** Who the evaluation is about, as stored: linked, or typed in by hand. */
export interface EvaluationCandidate {
  kind: 'application' | 'form' | 'manual';
  /** The application's or form's public id; null when typed in. */
  id: string | null;
  name: string;
  position: string | null;
  department: string | null;
}

export interface InterviewEvaluation extends Outcome {
  id: string;
  candidate: EvaluationCandidate;
  interviewDate: string;
  round: 1 | 2;
  evaluatorRole: InterviewEvaluationRow['evaluatorRole'];
  evaluator: { email: string; name: string | null };
  senior: boolean;
  generalScores: number[];
  seniorScores: number[] | null;
  result: InterviewEvaluationRow['result'];
  failReason: string | null;
  comment: string | null;
  /** Sent by an invited evaluator through a link (not entered in the admin). */
  viaInvitation: boolean;
  /** Changed by someone other than its evaluator (manage), if it was. */
  edited: { by: string; at: Date } | null;
  createdAt: Date;
  updatedAt: Date;
}

/** One candidate and every evaluation of theirs — a row of the admin list. */
export interface CandidateEvaluations {
  /** For the candidate page's url (lib/interview/candidate-key.ts). */
  key: string;
  candidate: EvaluationCandidate;
  evaluations: InterviewEvaluation[];
}

/** The signed-in admin who fills it in. */
export interface Evaluator {
  email: string;
  name: string | null;
}

/** Interview evaluations — migration 0006. */
export function createInterviewEvaluationRepository(db: Database) {
  const live = ne(interviewEvaluations.status, 'DELETED');

  const columns = {
    row: interviewEvaluations,
    applicationId: applications.id,
    applicationFormId: applicationForms.id,
  };

  type Joined = { row: InterviewEvaluationRow; applicationId: string | null; applicationFormId: string | null };

  function present({ row, applicationId, applicationFormId }: Joined): InterviewEvaluation {
    const candidate: EvaluationCandidate = {
      kind: applicationId ? 'application' : applicationFormId ? 'form' : 'manual',
      id: applicationId ?? applicationFormId ?? null,
      name: row.candidateName,
      position: row.position,
      department: row.department,
    };
    const scores = { general: row.generalScores, senior: row.seniorScores };
    return {
      id: row.id,
      candidate,
      interviewDate: row.interviewDate,
      round: row.round as 1 | 2,
      evaluatorRole: row.evaluatorRole,
      evaluator: { email: row.evaluatorEmail, name: row.evaluatorName },
      senior: row.senior,
      generalScores: row.generalScores,
      seniorScores: row.seniorScores,
      ...outcomeOf(scores),
      result: row.result,
      failReason: row.failReason,
      comment: row.comment,
      viaInvitation: row.invitationsPk !== null,
      edited: row.editedBy && row.editedAt ? { by: row.editedBy, at: row.editedAt } : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  const joined = () =>
    db
      .select(columns)
      .from(interviewEvaluations)
      .leftJoin(applications, eq(applications.pk, interviewEvaluations.applicationsPk))
      .leftJoin(applicationForms, eq(applicationForms.pk, interviewEvaluations.applicationFormsPk));

  /** The links and the stored columns for one input; 400 for an application or form that is not there. */
  async function valuesOf(input: InterviewEvaluationInput) {
    let applicationsPk: number | null = null;
    let applicationFormsPk: number | null = null;
    // A linked candidate's name is the record's, not whatever the form sent:
    // otherwise an edit would quietly rename the applicant in every list.
    let linkedName: string | null = null;
    if (input.applicationId) {
      const [row] = await db
        .select({
          pk: applications.pk,
          name: sql<string>`${applications.firstName} || ' ' || ${applications.lastName}`,
        })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), ne(applications.status, 'DELETED')))
        .limit(1);
      if (!row) throw new BadRequestError('No such applicant.', [{ path: 'applicationId', message: 'not found' }]);
      applicationsPk = row.pk;
      linkedName = row.name;
    }
    if (input.applicationFormId) {
      const [row] = await db
        .select({ pk: applicationForms.pk, name: applicationForms.nameTh })
        .from(applicationForms)
        .where(and(eq(applicationForms.id, input.applicationFormId), ne(applicationForms.status, 'DELETED')))
        .limit(1);
      if (!row)
        throw new BadRequestError('No such application form.', [{ path: 'applicationFormId', message: 'not found' }]);
      applicationFormsPk = row.pk;
      linkedName = row.name;
    }
    const outcome = outcomeOf({ general: input.generalScores, senior: input.senior ? input.seniorScores : null });
    return {
      applicationsPk,
      applicationFormsPk,
      candidateName: linkedName ?? input.candidateName,
      position: input.position,
      department: input.department,
      interviewDate: input.interviewDate,
      round: input.round,
      evaluatorRole: input.evaluatorRole,
      senior: input.senior,
      generalScores: input.generalScores,
      seniorScores: input.senior ? input.seniorScores : null,
      generalTotal: outcome.generalTotal,
      seniorTotal: outcome.seniorTotal,
      result: input.result,
      failReason: input.result === 'FAIL' ? input.failReason : null,
      comment: input.comment,
    };
  }

  async function get(id: string): Promise<InterviewEvaluation> {
    if (!isUuid(id)) throw new NotFoundError('interview evaluation', id);
    const [row] = await joined()
      .where(and(live, eq(interviewEvaluations.id, id)))
      .limit(1);
    if (!row) throw new NotFoundError('interview evaluation', id);
    return present(row);
  }

  /** Each candidate with their evaluations so far: one query for the lot. */
  async function withEvaluated(list: Omit<Candidate, 'evaluated'>[]): Promise<Candidate[]> {
    const ids = (kind: Candidate['kind']) => list.filter((c) => c.kind === kind).map((c) => c.id);
    const [apps, forms] = [ids('application'), ids('form')];
    const rows =
      apps.length || forms.length
        ? await db
            .select({
              applicationId: applications.id,
              applicationFormId: applicationForms.id,
              round: interviewEvaluations.round,
              evaluatorRole: interviewEvaluations.evaluatorRole,
              evaluator: sql<string>`coalesce(${interviewEvaluations.evaluatorName}, ${interviewEvaluations.evaluatorEmail})`,
              interviewDate: interviewEvaluations.interviewDate,
            })
            .from(interviewEvaluations)
            .leftJoin(applications, eq(applications.pk, interviewEvaluations.applicationsPk))
            .leftJoin(applicationForms, eq(applicationForms.pk, interviewEvaluations.applicationFormsPk))
            .where(
              and(
                live,
                or(
                  apps.length ? inArray(applications.id, apps) : undefined,
                  forms.length ? inArray(applicationForms.id, forms) : undefined,
                ),
              ),
            )
            .orderBy(
              asc(interviewEvaluations.round),
              asc(interviewEvaluations.interviewDate),
              asc(interviewEvaluations.createdAt),
            )
        : [];
    return list.map((c) => ({
      ...c,
      evaluated: rows
        .filter((r) => (c.kind === 'application' ? r.applicationId : r.applicationFormId) === c.id)
        .map(({ applicationId: _, applicationFormId: __, round, ...rest }) => ({ round: round as 1 | 2, ...rest })),
    }));
  }

  /** Every evaluation of one candidate (see candidate-key.ts): round 1 then 2, newest first within a round. */
  async function forCandidate(ref: CandidateRef): Promise<InterviewEvaluation[]> {
    const who =
      ref.kind === 'application'
        ? eq(applications.id, ref.id)
        : ref.kind === 'form'
          ? eq(applicationForms.id, ref.id)
          : and(
              isNull(interviewEvaluations.applicationsPk),
              isNull(interviewEvaluations.applicationFormsPk),
              sql`lower(btrim(${interviewEvaluations.candidateName})) = lower(btrim(${ref.name}))`,
            );
    const rows = await joined()
      .where(and(live, who))
      .orderBy(asc(interviewEvaluations.round), desc(interviewEvaluations.updatedAt));
    return rows.map(present);
  }

  return {
    /**
     * Applicants and application forms whose name (or email, phone) matches —
     * for picking who is being evaluated. Newest first, at most `limit`.
     */
    async candidates(q: string, limit = 10): Promise<Candidate[]> {
      const pattern = likePattern(q.trim());
      // Phones compared as digits only: "081-234 5678" finds 0812345678 and the reverse.
      const digits = q.replace(/\D/g, '');
      const phoneLike = (column: typeof applications.phone | typeof applicationForms.mobile) =>
        digits.length >= 3
          ? sql`regexp_replace(coalesce(${column}, ''), '\\D', '', 'g') like ${likePattern(digits)}`
          : ilike(column, pattern);
      const [fromApplications, fromForms] = await Promise.all([
        db
          .select({
            id: applications.id,
            name: sql<string>`${applications.firstName} || ' ' || ${applications.lastName}`,
            position: jobTitle,
            department: jobs.department,
            email: applications.email,
            createdAt: applications.createdAt,
          })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(
            and(
              ne(applications.status, 'DELETED'),
              or(
                ilike(sql`${applications.firstName} || ' ' || ${applications.lastName}`, pattern),
                ilike(applications.email, pattern),
                phoneLike(applications.phone),
              ),
            ),
          )
          .orderBy(desc(applications.createdAt))
          .limit(limit),
        db
          .select({
            id: applicationForms.id,
            name: applicationForms.nameTh,
            position: applicationForms.position,
            department: jobs.department,
            email: applicationForms.email,
            createdAt: applicationForms.createdAt,
          })
          .from(applicationForms)
          .leftJoin(jobs, eq(jobs.pk, applicationForms.jobsPk))
          .where(
            and(
              ne(applicationForms.status, 'DELETED'),
              or(
                ilike(applicationForms.nameTh, pattern),
                ilike(applicationForms.nameEn, pattern),
                ilike(applicationForms.email, pattern),
                phoneLike(applicationForms.mobile),
              ),
            ),
          )
          .orderBy(desc(applicationForms.createdAt))
          .limit(limit),
      ]);
      return withEvaluated(
        [
          ...fromApplications.map((c) => ({ ...c, kind: 'application' as const })),
          ...fromForms.map((c) => ({ ...c, kind: 'form' as const })),
        ]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit),
      );
    },

    /** One applicant or application form, to start an evaluation with (prefill); undefined if not found. */
    async candidate(kind: 'application' | 'form', id: string): Promise<Candidate | undefined> {
      if (!isUuid(id)) return undefined;
      if (kind === 'application') {
        const [row] = await db
          .select({
            id: applications.id,
            name: sql<string>`${applications.firstName} || ' ' || ${applications.lastName}`,
            position: jobTitle,
            department: jobs.department,
            email: applications.email,
            createdAt: applications.createdAt,
          })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(and(eq(applications.id, id), ne(applications.status, 'DELETED')))
          .limit(1);
        return row && (await withEvaluated([{ ...row, kind }]))[0];
      }
      const [row] = await db
        .select({
          id: applicationForms.id,
          name: applicationForms.nameTh,
          position: applicationForms.position,
          department: jobs.department,
          email: applicationForms.email,
          createdAt: applicationForms.createdAt,
        })
        .from(applicationForms)
        .leftJoin(jobs, eq(jobs.pk, applicationForms.jobsPk))
        .where(and(eq(applicationForms.id, id), ne(applicationForms.status, 'DELETED')))
        .limit(1);
      return row && (await withEvaluated([{ ...row, kind }]))[0];
    },

    forCandidate,

    async create(input: InterviewEvaluationInput, evaluator: Evaluator): Promise<InterviewEvaluation> {
      // One evaluation per evaluator, candidate, round and side — a second is a
      // 409 pointing at the first (changed through an edit link, not again).
      const ref: CandidateRef = input.applicationId
        ? { kind: 'application', id: input.applicationId }
        : input.applicationFormId
          ? { kind: 'form', id: input.applicationFormId }
          : { kind: 'manual', name: input.candidateName };
      const twin = (await forCandidate(ref)).find(
        (e) =>
          e.round === input.round &&
          e.evaluatorRole === input.evaluatorRole &&
          e.evaluator.email.toLowerCase() === evaluator.email.toLowerCase(),
      );
      if (twin)
        throw new ConflictError(
          `You have already evaluated this round of this candidate (evaluation ${twin.id}) — ask for an edit link to change it.`,
        );
      const [row] = await db
        .insert(interviewEvaluations)
        .values({ ...(await valuesOf(input)), evaluatorEmail: evaluator.email, evaluatorName: evaluator.name })
        .returning({ id: interviewEvaluations.id });
      return get(row!.id);
    },

    /** Newest interview first; `q` matches the candidate, position, department or evaluator. */
    async list(filter: Page & { q?: string }): Promise<{ items: InterviewEvaluation[]; total: number }> {
      const conditions = [live];
      if (filter.q) {
        const pattern = likePattern(filter.q);
        conditions.push(
          or(
            ilike(interviewEvaluations.candidateName, pattern),
            ilike(interviewEvaluations.position, pattern),
            ilike(interviewEvaluations.department, pattern),
            ilike(interviewEvaluations.evaluatorEmail, pattern),
            ilike(interviewEvaluations.evaluatorName, pattern),
          )!,
        );
      }
      const where = and(...conditions);
      const [rows, [total]] = await Promise.all([
        joined()
          .where(where)
          .orderBy(desc(interviewEvaluations.interviewDate), desc(interviewEvaluations.createdAt))
          .limit(filter.pageSize)
          .offset(offsetOf(filter)),
        db.select({ n: count() }).from(interviewEvaluations).where(where),
      ]);
      return { items: rows.map(present), total: total?.n ?? 0 };
    },

    /**
     * The admin list: one item per candidate (grouped as forCandidate does),
     * with every evaluation of theirs. Newest interview first; `q` matches the
     * candidate, position, department or evaluator of any of them.
     * ponytail: grouped in memory over every live evaluation — fine for an HR
     * team's interviews; a GROUP BY on the key in SQL once there are tens of thousands.
     */
    async byCandidate(filter: Page & { q?: string }): Promise<{ items: CandidateEvaluations[]; total: number }> {
      const rows = (await joined().where(live)).map(present);
      const groups = new Map<string, InterviewEvaluation[]>();
      for (const e of rows) {
        // lower(): a typed-in name groups case-insensitively, as in forCandidate (ids are lower case already).
        const key = candidateKey(e.candidate).toLowerCase();
        groups.set(key, [...(groups.get(key) ?? []), e]);
      }
      const q = filter.q?.trim().toLowerCase();
      const matches = (e: InterviewEvaluation) =>
        [e.candidate.name, e.candidate.position, e.candidate.department, e.evaluator.email, e.evaluator.name].some(
          (field) => field?.toLowerCase().includes(q!),
        );
      const newest = (list: InterviewEvaluation[]) =>
        list.reduce((a, b) => (b.interviewDate > a.interviewDate ? b : a));
      const all = [...groups.values()]
        .filter((list) => !q || list.some(matches))
        .sort((a, b) => newest(b).interviewDate.localeCompare(newest(a).interviewDate))
        .map((evaluations): CandidateEvaluations => {
          // Who it is: as the newest change has them (as the candidate page shows them).
          const { candidate } = evaluations.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
          return { key: candidateKey(candidate), candidate, evaluations };
        });
      const from = offsetOf(filter);
      return { items: all.slice(from, from + filter.pageSize), total: all.length };
    },

    get,

    async softDelete(id: string, actor: string | null): Promise<void> {
      if (!isUuid(id)) throw new NotFoundError('interview evaluation', id);
      const [row] = await db
        .update(interviewEvaluations)
        .set({ status: 'DELETED', deletedAt: new Date(), deletedBy: actor })
        .where(and(live, eq(interviewEvaluations.id, id)))
        .returning({ id: interviewEvaluations.id });
      if (!row) throw new NotFoundError('interview evaluation', id);
    },
  };
}

export type InterviewEvaluationRepository = ReturnType<typeof createInterviewEvaluationRepository>;
