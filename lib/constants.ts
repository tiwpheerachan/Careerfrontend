/**
 * The fixed value lists, as plain data. The database enums (lib/db/schema/enums.ts)
 * and the API schemas (lib/api/schemas.ts) both read them from here, so the two
 * cannot disagree — and the browser can import them without pulling in Drizzle.
 */
export const LOCALES = ['th', 'en', 'zh'] as const;
export const STATUSES = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export const JOB_PUBLISH_STATES = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;
export const APPLICATION_STAGES = ['NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'] as const;
export const APPLICATION_FILE_KINDS = ['RESUME', 'TRANSCRIPT', 'ATTACHMENT'] as const;
export const EDUCATION_LEVELS = [
  'HIGH_SCHOOL',
  'VOCATIONAL_CERT',
  'HIGHER_VOCATIONAL_CERT',
  'DIPLOMA',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
  'STUDYING',
  'INCOMPLETE',
  'OTHER',
] as const;
