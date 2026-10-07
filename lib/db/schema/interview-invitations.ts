import { boolean, index, pgTable, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { applicationForms } from './application-forms';
import { applications } from './applications';
import { timestamps } from './columns';
import { primaryPk, publicId, refPk } from './ids';
import { evaluatorRole, interviewEvaluations } from './interview-evaluations';

/**
 * A link that lets the people on it evaluate one candidate's round, signed in
 * with SSO but without a role — migration 0007, rules in
 * lib/interview/invitations.ts.
 */
export const interviewInvitations = pgTable(
  'interview_invitations',
  {
    pk: primaryPk(),
    id: publicId(),
    token: text('token').notNull(),
    applicationsPk: refPk('applications_pk').references(() => applications.pk),
    applicationFormsPk: refPk('application_forms_pk').references(() => applicationForms.pk),
    candidateName: text('candidate_name').notNull(),
    position: text('position'),
    department: text('department'),
    round: smallint('round').notNull(),
    evaluatorRole: evaluatorRole('evaluator_role').notNull(),
    /** HR's call: items 11–15 are scored (a Senior position). */
    senior: boolean('senior').notNull().default(false),
    createdBy: text('created_by').notNull(),
    createdByName: text('created_by_name'),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    revokedBy: text('revoked_by'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('interview_invitations_id_idx').on(table.id),
    uniqueIndex('interview_invitations_token_idx').on(table.token),
    index('interview_invitations_application_idx').on(table.applicationsPk),
    index('interview_invitations_form_idx').on(table.applicationFormsPk),
  ],
);

/** One person on an invitation, from the company directory. */
export const interviewInvitees = pgTable(
  'interview_invitees',
  {
    pk: primaryPk(),
    id: publicId(),
    invitationsPk: refPk('interview_invitations_pk')
      .notNull()
      .references(() => interviewInvitations.pk, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name'),
    unionId: text('union_id'),
    jobTitle: text('job_title'),
    department: text('department'),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }),
    evaluationsPk: refPk('interview_evaluations_pk').references(() => interviewEvaluations.pk),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('interview_invitees_id_idx').on(table.id),
    uniqueIndex('interview_invitees_email_idx').on(table.invitationsPk, sql`lower(${table.email})`),
  ],
);

export type InterviewInvitationRow = typeof interviewInvitations.$inferSelect;
export type InterviewInviteeRow = typeof interviewInvitees.$inferSelect;
