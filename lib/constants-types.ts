import type { APPLICATION_FILE_KINDS, APPLICATION_STAGES, EDUCATION_LEVELS, JOB_PUBLISH_STATES } from './constants';

/** The value types of lib/constants.ts — importable from the browser without Drizzle. */
export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
export type JobPublishState = (typeof JOB_PUBLISH_STATES)[number];
export type ApplicationFileKind = (typeof APPLICATION_FILE_KINDS)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
