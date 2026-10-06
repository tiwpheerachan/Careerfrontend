import { pgEnum } from 'drizzle-orm/pg-core';
import {
  APPLICATION_FILE_KINDS,
  APPLICATION_STAGES,
  EDUCATION_LEVELS,
  JOB_PUBLISH_STATES,
  LOCALES,
  STATUSES,
} from '@/lib/constants';

/**
 * The lifecycle of a row, on every table that can be switched off or deleted.
 *
 *   ACTIVE    live
 *   INACTIVE  kept, but switched off
 *   DELETED   soft-deleted: hidden from lists by default, never removed
 *
 * The column is named `status` (not `status_id` — it is not a foreign key).
 * A job's publishing state and an application's hiring stage are different
 * questions and get their own columns below.
 */
export const status = pgEnum('status', STATUSES);

/** The site's languages. Same list as lib/i18n/routing.ts. */
export const locale = pgEnum('locale', LOCALES);

/**
 * Whether a job is on the public site.
 *   DRAFT      being written; only the admin sees it
 *   PUBLISHED  listed, and accepting applications
 *   CLOSED     no longer listed, no new applications; kept with its applicants
 */
export const jobPublishState = pgEnum('job_publish_state', JOB_PUBLISH_STATES);

/** Where an application is in hiring. Every change is recorded in application_stage_changes (by trigger). */
export const applicationStage = pgEnum('application_stage', APPLICATION_STAGES);

export const applicationFileKind = pgEnum('application_file_kind', APPLICATION_FILE_KINDS);

/**
 * Highest education, as a code; each language has its own label in messages/.
 * (The old form stored the English label itself.)
 */
export const educationLevel = pgEnum('education_level', EDUCATION_LEVELS);

export type Status = (typeof STATUSES)[number];
export type Locale = (typeof LOCALES)[number];
export type JobPublishState = (typeof JOB_PUBLISH_STATES)[number];
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export type ApplicationFileKind = (typeof APPLICATION_FILE_KINDS)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
