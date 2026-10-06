import { sql } from 'drizzle-orm';
import { char, index, integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { lifecycle, timestamps } from './columns';
import { jobPublishState, locale } from './enums';
import { primaryPk, publicId, refPk } from './ids';

/**
 * An open position.
 *
 * `code` is the human job id the old system used (SHD-TH-HRBP): upper case,
 * unique among rows that are not deleted, and what the public url carries
 * (/th/jobs/SHD-TH-HRBP). It is a business key, not the pk.
 *
 * The text a visitor reads lives in job_translations, one row per language.
 */
export const jobs = pgTable(
  'jobs',
  {
    pk: primaryPk(),
    id: publicId(),
    code: text('code').notNull(),
    ...lifecycle(),
    publishState: jobPublishState('publish_state').notNull().default('DRAFT'),
    /** ISO 3166-1 alpha-2 (TH, PH, VN…). The label per language comes from messages/. */
    countryCode: char('country_code', { length: 2 }).notNull(),
    department: text('department'),
    level: text('level'),
    /** Openings. Null = not stated. */
    quantity: integer('quantity'),
    /** First time it went PUBLISHED; the public list sorts by it. Set by trigger. */
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('jobs_id_idx').on(table.id),
    uniqueIndex('jobs_code_live_idx')
      .on(table.code)
      .where(sql`status <> 'DELETED'`),
    index('jobs_public_idx').on(table.publishState, table.status),
    index('jobs_country_idx').on(table.countryCode),
    index('jobs_department_idx').on(table.department),
  ],
);

export const jobTranslations = pgTable(
  'job_translations',
  {
    pk: primaryPk(),
    id: publicId(),
    jobsPk: refPk('jobs_pk')
      .notNull()
      .references(() => jobs.pk, { onDelete: 'cascade' }),
    locale: locale('locale').notNull(),
    title: text('title').notNull(),
    location: text('location'),
    description: text('description'),
    qualifications: text('qualifications'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('job_translations_id_idx').on(table.id),
    uniqueIndex('job_translations_job_locale_idx').on(table.jobsPk, table.locale),
  ],
);

export type JobRow = typeof jobs.$inferSelect;
export type JobTranslationRow = typeof jobTranslations.$inferSelect;
