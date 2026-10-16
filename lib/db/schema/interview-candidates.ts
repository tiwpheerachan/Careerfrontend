import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { applicationForms } from './application-forms';
import { applications } from './applications';
import { lifecycle, timestamps } from './columns';
import { primaryPk, publicId, refPk } from './ids';

/**
 * A candidate HR added before they have an application — migration 0013. Invited
 * and evaluated like anyone else, then linked to their application or form once
 * it exists (lib/repositories/interview-candidates.ts).
 */
export const interviewCandidates = pgTable(
  'interview_candidates',
  {
    pk: primaryPk(),
    id: publicId(),
    ...lifecycle(),
    name: text('name').notNull(),
    position: text('position'),
    department: text('department'),
    /** HR's only: to tell people of the same name apart and to find their form. */
    phone: text('phone'),
    resumePath: text('resume_path'),
    resumeName: text('resume_name'),
    resumeType: text('resume_type'),
    linkedApplicationsPk: refPk('linked_applications_pk').references(() => applications.pk),
    linkedApplicationFormsPk: refPk('linked_application_forms_pk').references(() => applicationForms.pk),
    linkedAt: timestamp('linked_at', { withTimezone: true, mode: 'date' }),
    linkedBy: text('linked_by'),
    createdBy: text('created_by').notNull(),
    createdByName: text('created_by_name'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('interview_candidates_id_idx').on(table.id),
    index('interview_candidates_created_idx').on(table.createdAt.desc()),
  ],
);

export type InterviewCandidateRow = typeof interviewCandidates.$inferSelect;
