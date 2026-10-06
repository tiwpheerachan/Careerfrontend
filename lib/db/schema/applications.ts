import { sql } from 'drizzle-orm';
import { bigint, boolean, date, index, pgTable, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { lifecycle, timestamps } from './columns';
import { applicationFileKind, applicationStage, educationLevel, locale } from './enums';
import { primaryPk, publicId, refPk } from './ids';
import { jobs } from './jobs';

/**
 * One person applying for one job.
 *
 * Personal data. It is never logged, never sent to Sentry, and only reachable
 * through the admin API.
 */
export const applications = pgTable(
  'applications',
  {
    pk: primaryPk(),
    id: publicId(),
    jobsPk: refPk('jobs_pk')
      .notNull()
      .references(() => jobs.pk),
    ...lifecycle(),
    stage: applicationStage('stage').notNull().default('NEW'),
    /** When `stage` last changed, and who changed it. stage_changed_at is set by trigger. */
    stageChangedAt: timestamp('stage_changed_at', { withTimezone: true, mode: 'date' }),
    stageChangedBy: text('stage_changed_by'),
    /** The language the form was filled in. */
    locale: locale('locale').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    residenceCountry: text('residence_country'),
    address: text('address'),
    visaRequired: boolean('visa_required').notNull().default(false),
    availableFrom: date('available_from', { mode: 'string' }),
    /** http(s) only — a CHECK refuses javascript: and friends (the old site's stored XSS). */
    websiteUrl: text('website_url'),
    sourceChannel: text('source_channel'),
    termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true, mode: 'date' }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('applications_id_idx').on(table.id),
    index('applications_job_idx').on(table.jobsPk),
    index('applications_stage_idx').on(table.stage),
    index('applications_created_idx').on(table.createdAt.desc()),
    index('applications_email_idx').on(sql`lower(${table.email})`),
  ],
);

export const applicationEducations = pgTable(
  'application_educations',
  {
    pk: primaryPk(),
    id: publicId(),
    applicationsPk: refPk('applications_pk')
      .notNull()
      .references(() => applications.pk, { onDelete: 'cascade' }),
    /** Order on the form, from 0. */
    position: smallint('position').notNull(),
    level: educationLevel('level'),
    institute: text('institute'),
    program: text('program'),
    /** First day of the month the form picked (YYYY-MM-01). */
    startMonth: date('start_month', { mode: 'string' }),
    endMonth: date('end_month', { mode: 'string' }),
    gpa: text('gpa'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('application_educations_id_idx').on(table.id),
    index('application_educations_application_idx').on(table.applicationsPk),
  ],
);

export const applicationExperiences = pgTable(
  'application_experiences',
  {
    pk: primaryPk(),
    id: publicId(),
    applicationsPk: refPk('applications_pk')
      .notNull()
      .references(() => applications.pk, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    company: text('company'),
    role: text('role'),
    startMonth: date('start_month', { mode: 'string' }),
    endMonth: date('end_month', { mode: 'string' }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('application_experiences_id_idx').on(table.id),
    index('application_experiences_application_idx').on(table.applicationsPk),
  ],
);

export const applicationSkills = pgTable(
  'application_skills',
  {
    pk: primaryPk(),
    id: publicId(),
    applicationsPk: refPk('applications_pk')
      .notNull()
      .references(() => applications.pk, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    skill: text('skill').notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('application_skills_id_idx').on(table.id),
    uniqueIndex('application_skills_unique_idx').on(table.applicationsPk, sql`lower(${table.skill})`),
  ],
);

/**
 * Uploaded documents. The file itself is in a PRIVATE Supabase Storage bucket;
 * this row holds its path, and the admin gets a short-lived signed url. Never a
 * public url (the old site's bucket was public).
 */
export const applicationFiles = pgTable(
  'application_files',
  {
    pk: primaryPk(),
    id: publicId(),
    applicationsPk: refPk('applications_pk')
      .notNull()
      .references(() => applications.pk, { onDelete: 'cascade' }),
    kind: applicationFileKind('kind').notNull(),
    storagePath: text('storage_path').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('application_files_id_idx').on(table.id),
    uniqueIndex('application_files_path_idx').on(table.storagePath),
    index('application_files_application_idx').on(table.applicationsPk),
    // At most one résumé and one transcript per application.
    uniqueIndex('application_files_one_resume_idx')
      .on(table.applicationsPk)
      .where(sql`kind = 'RESUME'`),
    uniqueIndex('application_files_one_transcript_idx')
      .on(table.applicationsPk)
      .where(sql`kind = 'TRANSCRIPT'`),
  ],
);

/** Reviewer notes: a history with authors, instead of the old single overwritten admin_note. */
export const applicationNotes = pgTable(
  'application_notes',
  {
    pk: primaryPk(),
    id: publicId(),
    applicationsPk: refPk('applications_pk')
      .notNull()
      .references(() => applications.pk, { onDelete: 'cascade' }),
    ...lifecycle(),
    body: text('body').notNull(),
    createdBy: text('created_by'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('application_notes_id_idx').on(table.id),
    index('application_notes_application_idx').on(table.applicationsPk, table.createdAt),
  ],
);

/**
 * Every stage change, written by the applications_record_stage_change trigger —
 * never by app code. The audit trail the old system did not have, and the data
 * for time-to-hire.
 */
export const applicationStageChanges = pgTable(
  'application_stage_changes',
  {
    pk: primaryPk(),
    id: publicId(),
    applicationsPk: refPk('applications_pk')
      .notNull()
      .references(() => applications.pk, { onDelete: 'cascade' }),
    fromStage: applicationStage('from_stage'),
    toStage: applicationStage('to_stage').notNull(),
    changedBy: text('changed_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('application_stage_changes_id_idx').on(table.id),
    index('application_stage_changes_application_idx').on(table.applicationsPk, table.createdAt),
  ],
);

export type ApplicationRow = typeof applications.$inferSelect;
export type ApplicationFileRow = typeof applicationFiles.$inferSelect;
