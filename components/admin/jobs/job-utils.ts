import { JOB_PUBLISH_STATES, LOCALES } from '@/lib/constants';
import type { JobPublishState } from '@/lib/constants-types';

/**
 * Small pieces the jobs list and the job editor share. Plain data and
 * functions, importable from server and client components alike.
 */

export const PUBLISH_STATES = JOB_PUBLISH_STATES;
export const JOB_LANGS = LOCALES;
export type JobLang = (typeof LOCALES)[number];

export interface JobTextLike {
  title: string;
}

/** The job's name in the admin: Thai, else English, else Chinese, else its code (the old jobTitle). */
export function jobTitle(job: { code: string; translations: Partial<Record<JobLang, JobTextLike>> }): string {
  return job.translations.th?.title || job.translations.en?.title || job.translations.zh?.title || job.code;
}

/** `?state=published` ↔ PUBLISHED. Lower case in the url, as the old admin's status values were. */
export function stateFromParam(value: string | string[] | undefined): JobPublishState | undefined {
  const upper = typeof value === 'string' ? value.toUpperCase() : '';
  return (PUBLISH_STATES as readonly string[]).includes(upper) ? (upper as JobPublishState) : undefined;
}

export const stateToParam = (state: JobPublishState) => state.toLowerCase();

/** The server's JobCode rule (lib/api/schemas.ts), for checking before sending. */
export const JOB_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,63}$/;

/** Countries offered for a new job, beside the ones already in use. */
export const DEFAULT_COUNTRIES = ['TH', 'CN', 'ID', 'PH', 'VN', 'BR', 'MX', 'MY', 'SG'] as const;
