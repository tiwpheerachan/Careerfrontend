import { and, count, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import {
  applicationForms,
  applications,
  interviewEvaluations,
  jobs,
  type InterviewEvaluationRow,
} from '@/lib/db/schema';
import { BadRequestError, NotFoundError } from '@/lib/errors';
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
  createdAt: Date;
  updatedAt: Date;
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
    if (input.applicationId) {
      const [row] = await db
        .select({ pk: applications.pk })
        .from(applications)
        .where(and(eq(applications.id, input.applicationId), ne(applications.status, 'DELETED')))
        .limit(1);
      if (!row) throw new BadRequestError('No such applicant.', [{ path: 'applicationId', message: 'not found' }]);
      applicationsPk = row.pk;
    }
    if (input.applicationFormId) {
      const [row] = await db
        .select({ pk: applicationForms.pk })
        .from(applicationForms)
        .where(and(eq(applicationForms.id, input.applicationFormId), ne(applicationForms.status, 'DELETED')))
        .limit(1);
      if (!row)
        throw new BadRequestError('No such application form.', [{ path: 'applicationFormId', message: 'not found' }]);
      applicationFormsPk = row.pk;
    }
    const outcome = outcomeOf({ general: input.generalScores, senior: input.senior ? input.seniorScores : null });
    return {
      applicationsPk,
      applicationFormsPk,
      candidateName: input.candidateName,
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

  return {
    /**
     * Applicants and application forms whose name (or email, phone) matches —
     * for picking who is being evaluated. Newest first, at most `limit`.
     */
    async candidates(q: string, limit = 10): Promise<Candidate[]> {
      const pattern = likePattern(q.trim());
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
                ilike(applications.phone, pattern),
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
                ilike(applicationForms.mobile, pattern),
              ),
            ),
          )
          .orderBy(desc(applicationForms.createdAt))
          .limit(limit),
      ]);
      return [
        ...fromApplications.map((c) => ({ ...c, kind: 'application' as const })),
        ...fromForms.map((c) => ({ ...c, kind: 'form' as const })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async create(input: InterviewEvaluationInput, evaluator: Evaluator): Promise<InterviewEvaluation> {
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

    get,

    /** Replaces the scores and verdict. The evaluator stays who it was. */
    async update(id: string, input: InterviewEvaluationInput): Promise<InterviewEvaluation> {
      if (!isUuid(id)) throw new NotFoundError('interview evaluation', id);
      const [row] = await db
        .update(interviewEvaluations)
        .set(await valuesOf(input))
        .where(and(live, eq(interviewEvaluations.id, id)))
        .returning({ id: interviewEvaluations.id });
      if (!row) throw new NotFoundError('interview evaluation', id);
      return get(row.id);
    },

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
