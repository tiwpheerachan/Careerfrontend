import { sql } from 'drizzle-orm';
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import type { ApplicationFormAnswers, ApplicationFormSensitive } from '@/lib/application-form/schema';
import { APPLICATION_FORM_LETTERHEADS } from '@/lib/constants';
import { lifecycle, timestamps } from './columns';
import { locale } from './enums';
import { primaryPk, publicId, refPk } from './ids';
import { jobs } from './jobs';

/** Which company's blank form the answers are printed on. */
export const applicationFormLetterhead = pgEnum('application_form_letterhead', APPLICATION_FORM_LETTERHEADS);

/**
 * The paper application form (ใบสมัครงาน), sent from the public site's
 * /application-form — see migration 0005 and lib/application-form/.
 *
 * Personal data: never logged, only reachable through the admin API.
 */
export const applicationForms = pgTable(
  'application_forms',
  {
    pk: primaryPk(),
    id: publicId(),
    ...lifecycle(),
    locale: locale('locale').notNull(),
    letterhead: applicationFormLetterhead('letterhead').notNull(),
    /** The published job chosen, if one was; null for "other". */
    jobsPk: refPk('jobs_pk').references(() => jobs.pk),
    position: text('position').notNull(),
    nameTh: text('name_th').notNull(),
    nameEn: text('name_en'),
    email: text('email').notNull(),
    mobile: text('mobile').notNull(),
    answers: jsonb('answers').$type<ApplicationFormAnswers>().notNull(),
    sensitive: jsonb('sensitive').$type<ApplicationFormSensitive>(),
    sensitiveConsentAt: timestamp('sensitive_consent_at', { withTimezone: true, mode: 'date' }),
    certifiedAt: timestamp('certified_at', { withTimezone: true, mode: 'date' }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('application_forms_id_idx').on(table.id),
    index('application_forms_job_idx').on(table.jobsPk),
    index('application_forms_created_idx').on(table.createdAt.desc()),
    index('application_forms_email_idx').on(sql`lower(${table.email})`),
  ],
);

export type ApplicationFormRow = typeof applicationForms.$inferSelect;
