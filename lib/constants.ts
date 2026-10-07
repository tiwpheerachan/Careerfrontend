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

/**
 * The paper application form (ใบสมัครงาน), filled in on the public site and
 * printed onto the company's own blank form — lib/application-form/.
 * The letterhead is the company the applicant applies to.
 */
export const APPLICATION_FORM_LETTERHEADS = ['SHD', 'RABBIT', 'TOPONE', 'PLAIN'] as const;
export const GENDERS = ['MALE', 'FEMALE'] as const;
export const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] as const;
/** The form's five boxes: served, deferred, reserve officer training done (จบ รด.), black card, exempt. */
export const MILITARY_STATUSES = ['SERVED', 'DEFERRED', 'RESERVIST', 'BLACK_CARD', 'EXEMPT'] as const;
/** The form's three education rows. */
export const FORM_EDUCATION_LEVELS = ['SECONDARY', 'DIPLOMA', 'DEGREE'] as const;
/** "พอใช้" "ดี" "ดีมาก". */
export const SKILL_LEVELS = ['FAIR', 'GOOD', 'EXCELLENT'] as const;
export const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
