import { boolean, date, index, pgEnum, pgTable, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';
import { applicationForms } from './application-forms';
import { applications } from './applications';
import { lifecycle, timestamps } from './columns';
import { primaryPk, publicId, refPk } from './ids';

export const evaluatorRole = pgEnum('evaluator_role', EVALUATOR_ROLES);
export const evaluationResult = pgEnum('evaluation_result', EVALUATION_RESULTS);

/**
 * One evaluator's interview scores for one candidate in one round — migration
 * 0006, scoring in lib/interview/scoring.ts.
 */
export const interviewEvaluations = pgTable(
  'interview_evaluations',
  {
    pk: primaryPk(),
    id: publicId(),
    ...lifecycle(),
    applicationsPk: refPk('applications_pk').references(() => applications.pk),
    applicationFormsPk: refPk('application_forms_pk').references(() => applicationForms.pk),
    candidateName: text('candidate_name').notNull(),
    position: text('position'),
    department: text('department'),
    interviewDate: date('interview_date', { mode: 'string' }).notNull(),
    round: smallint('round').notNull(),
    evaluatorRole: evaluatorRole('evaluator_role').notNull(),
    evaluatorEmail: text('evaluator_email').notNull(),
    evaluatorName: text('evaluator_name'),
    senior: boolean('senior').notNull().default(false),
    generalScores: smallint('general_scores').array().notNull(),
    seniorScores: smallint('senior_scores').array(),
    generalTotal: smallint('general_total').notNull(),
    seniorTotal: smallint('senior_total'),
    result: evaluationResult('result').notNull(),
    failReason: text('fail_reason'),
    comment: text('comment'),
    /** The invitation it came through (lib/db/schema/interview-invitations.ts), if any. No .references(): the two tables point at each other. */
    invitationsPk: refPk('interview_invitations_pk'),
    /** Someone other than the evaluator (manage) changed it: who, and when. */
    editedBy: text('edited_by'),
    editedAt: timestamp('edited_at', { withTimezone: true, mode: 'date' }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('interview_evaluations_id_idx').on(table.id),
    index('interview_evaluations_application_idx').on(table.applicationsPk),
    index('interview_evaluations_form_idx').on(table.applicationFormsPk),
    index('interview_evaluations_date_idx').on(table.interviewDate.desc(), table.createdAt.desc()),
  ],
);

export type InterviewEvaluationRow = typeof interviewEvaluations.$inferSelect;
