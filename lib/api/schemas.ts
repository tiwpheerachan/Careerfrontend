import { z } from 'zod';
import {
  APPLICATION_FILE_KINDS,
  APPLICATION_STAGES,
  EDUCATION_LEVELS,
  JOB_PUBLISH_STATES,
  LOCALES,
} from '@/lib/constants';

/**
 * The shapes of /api/v1, as zod. Each one is used twice: by the route to
 * validate what comes in, and by lib/api/openapi.ts to describe it. A field
 * changed here changes both, so the docs cannot drift from the code.
 */

// --- Building blocks -------------------------------------------------------------

export const Locale = z.enum(LOCALES).meta({ description: 'Site language.', example: 'th' });
export const JobPublishState = z.enum(JOB_PUBLISH_STATES).meta({
  description:
    'DRAFT = only the admin sees it · PUBLISHED = listed and accepting applications · CLOSED = unlisted, kept.',
});
export const ApplicationStage = z.enum(APPLICATION_STAGES).meta({ description: 'Hiring stage.' });
export const EducationLevel = z.enum(EDUCATION_LEVELS);

const DateTime = z.iso.datetime({ offset: true }).meta({ example: '2026-10-06T03:00:00.000Z' });
const Id = z.uuid().meta({ description: 'Public id (UUIDv7).', example: '0199b3c4-7d2e-7a10-9c4b-2f6e8d1a5b37' });

/** Optional free text: trimmed, and "" means "not given" (null). */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

/** Required free text, trimmed. */
const required = (max: number) => z.string().trim().min(1).max(max);

const YearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM')
  .nullable()
  .optional()
  .transform((value) => value || null)
  .meta({ example: '2024-03' });

export const JobCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{1,63}$/, 'letters, digits, - and _ only (2–64 characters)')
  .meta({
    description: 'The job id people see (old job_id). Case-insensitive; stored upper-case.',
    example: 'SHD-TH-OPS-LEAD-001',
  });

const CountryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'must be a 2-letter ISO country code')
  .meta({ description: 'ISO 3166-1 alpha-2.', example: 'TH' });

// --- Jobs --------------------------------------------------------------------------

export const JobText = z.object({
  title: required(200).meta({ example: 'CS Team Lead (Shopee)' }),
  location: text(200).meta({ example: 'Bangkok, Thailand' }),
  description: text(20_000),
  qualifications: text(20_000),
});

export const PublicJob = z.object({
  code: z.string().meta({ example: 'SHD-TH-OPS-LEAD-001' }),
  locale: Locale.meta({
    description: 'The language the text is in — another one when the asked-for translation is missing.',
  }),
  title: z.string(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  qualifications: z.string().nullable(),
  countryCode: z.string().meta({ example: 'TH' }),
  department: z.string().nullable(),
  level: z.string().nullable(),
  quantity: z.number().int().nullable(),
  publishedAt: DateTime.nullable(),
  updatedAt: DateTime,
});

export const JobFacets = z.object({
  countryCodes: z.array(z.string()),
  departments: z.array(z.string()),
  levels: z.array(z.string()),
});

export const PublicJobsQuery = z.object({
  locale: Locale.default('th'),
  q: z.string().trim().max(100).optional().meta({ description: 'Search title, location, department, level, code.' }),
  country: CountryCode.optional(),
  department: z.string().trim().max(100).optional(),
  level: z.string().trim().max(100).optional(),
});

export const LocaleQuery = z.object({ locale: Locale.default('th') });

export const JobCodeParams = z.object({ code: JobCode });

export const JobInput = z
  .object({
    code: JobCode,
    publishState: JobPublishState.default('DRAFT'),
    countryCode: CountryCode,
    department: text(100),
    level: text(100),
    quantity: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .nullable()
      .default(null)
      .meta({ description: 'Openings; null = not stated.' }),
    translations: z
      .partialRecord(Locale, JobText)
      .refine((value) => Object.values(value).some(Boolean), 'at least one language is required')
      .meta({ description: 'The text per language (th, en, zh). A language left out is removed.' }),
  })
  .meta({ description: 'A whole job. PUT replaces every field with this.' });

export const AdminJob = z.object({
  id: Id,
  code: z.string(),
  publishState: JobPublishState,
  countryCode: z.string(),
  department: z.string().nullable(),
  level: z.string().nullable(),
  quantity: z.number().int().nullable(),
  translations: z.partialRecord(Locale, JobText),
  applicantCount: z.number().int(),
  publishedAt: DateTime.nullable(),
  createdAt: DateTime,
  updatedAt: DateTime,
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
});

export const AdminJobsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  publishState: JobPublishState.optional(),
});

export const PublishStateInput = z.object({ publishState: JobPublishState });

export const IdParams = z.object({ id: Id });

// --- Applications: the public form ---------------------------------------------------

const Education = z
  .object({
    level: EducationLevel.nullable()
      .optional()
      .transform((v) => v ?? null),
    institute: text(200),
    program: text(200),
    startMonth: YearMonth,
    endMonth: YearMonth,
    gpa: text(20),
  })
  .refine((e) => !e.startMonth || !e.endMonth || e.endMonth >= e.startMonth, 'end month is before start month');

const Experience = z
  .object({
    company: text(200),
    role: text(200),
    startMonth: YearMonth,
    endMonth: YearMonth,
  })
  .refine((e) => !e.startMonth || !e.endMonth || e.endMonth >= e.startMonth, 'end month is before start month');

/** A multipart field holding JSON. */
const jsonField = <T extends z.ZodType>(schema: T, description: string) =>
  z
    .string()
    .default('[]')
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'must be valid JSON' });
        return z.NEVER;
      }
    })
    .pipe(schema)
    .meta({ description });

/** The text fields of the application form (multipart/form-data). The files are checked separately. */
export const ApplicationFields = z.object({
  locale: Locale.default('th'),
  firstName: required(100),
  lastName: required(100),
  email: z.string().trim().max(200).pipe(z.email()).meta({ example: 'someone@example.com' }),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]{6,40}$/, 'must be a phone number')
    .meta({ example: '+66 81 234 5678' }),
  residenceCountry: text(100),
  address: text(500),
  visaRequired: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  availableFrom: z
    .union([z.iso.date(), z.literal('')])
    .optional()
    .transform((v) => v || null)
    .meta({ description: 'YYYY-MM-DD' }),
  websiteUrl: z
    .union([z.url({ protocol: /^https?$/ }).max(500), z.literal('')])
    .optional()
    .transform((v) => v || null)
    .meta({ description: 'http(s) only.' }),
  sourceChannel: required(100).meta({ description: 'How they heard about the job.', example: 'LinkedIn' }),
  termsAccepted: z.literal('true', { error: 'the privacy terms must be accepted' }),
  educations: jsonField(
    z.array(Education).max(5),
    'JSON array, at most 5: {level, institute, program, startMonth, endMonth, gpa}.',
  ),
  experiences: jsonField(z.array(Experience).max(20), 'JSON array, at most 20: {company, role, startMonth, endMonth}.'),
  skills: jsonField(
    z
      .array(z.string().trim().min(1).max(60))
      .max(8)
      // Duplicates differing only in case are dropped; the first spelling wins.
      .transform((list) => list.filter((s, i) => list.findIndex((t) => t.toLowerCase() === s.toLowerCase()) === i)),
    'JSON array of strings, at most 8. Case-insensitive duplicates are dropped.',
  ),
  turnstileToken: z
    .string()
    .max(2048)
    .optional()
    .meta({ description: 'Cloudflare Turnstile token, when Turnstile is on.' }),
});

/** For the docs only: the form as it is sent, files included. */
export const ApplicationForm = ApplicationFields.extend({
  resume: z.file().meta({ description: 'Required. PDF, DOC or DOCX, ≤ 5 MB.' }),
  transcript: z.file().optional().meta({ description: 'Optional. PDF, DOC or DOCX, ≤ 5 MB.' }),
  attachments: z
    .array(z.file())
    .max(5)
    .optional()
    .meta({ description: 'Up to 5 files: PDF, DOC, DOCX, JPG or PNG, ≤ 10 MB each.' }),
});

export const ApplicationCreated = z.object({ id: Id.meta({ description: 'The application reference.' }) });

// --- Applications: the admin ---------------------------------------------------------

export const AdminApplicationsQuery = z.object({
  q: z.string().trim().max(100).optional().meta({ description: 'Name, email or phone.' }),
  stage: ApplicationStage.optional(),
  jobId: Id.optional().meta({ description: 'Only applications for this job (its public id).' }),
  sort: z
    .enum(['createdAt', 'name', 'stage', 'job'])
    .optional()
    .meta({ description: 'Default: createdAt (newest first).' }),
  dir: z.enum(['asc', 'desc']).optional().meta({ description: 'Default: desc for createdAt, asc otherwise.' }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ExportQuery = AdminApplicationsQuery.omit({ page: true, pageSize: true });

const JobSummary = z.object({
  id: Id,
  code: z.string(),
  title: z.string().nullable(),
  department: z.string().nullable(),
  level: z.string().nullable(),
  countryCode: z.string(),
});

export const ApplicationListItem = z.object({
  id: Id,
  stage: ApplicationStage,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  sourceChannel: z.string().nullable(),
  createdAt: DateTime,
  stageChangedAt: DateTime.nullable(),
  job: JobSummary,
});

const StageCounts = z.record(ApplicationStage, z.number().int());

export const ApplicationList = z.object({
  applications: z.array(ApplicationListItem),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  stageCounts: StageCounts.meta({
    description: 'Matches per stage, ignoring the stage filter — for the filter chips.',
  }),
});

const Note = z.object({ id: Id, body: z.string(), createdBy: z.string().nullable(), createdAt: DateTime });

export const ApplicationDetail = ApplicationListItem.extend({
  locale: Locale,
  residenceCountry: z.string().nullable(),
  address: z.string().nullable(),
  visaRequired: z.boolean(),
  availableFrom: z.iso.date().nullable(),
  websiteUrl: z.string().nullable(),
  termsAcceptedAt: DateTime,
  stageChangedBy: z.string().nullable(),
  educations: z.array(
    z.object({
      level: EducationLevel.nullable(),
      institute: z.string().nullable(),
      program: z.string().nullable(),
      startMonth: z.string().nullable(),
      endMonth: z.string().nullable(),
      gpa: z.string().nullable(),
    }),
  ),
  experiences: z.array(
    z.object({
      company: z.string().nullable(),
      role: z.string().nullable(),
      startMonth: z.string().nullable(),
      endMonth: z.string().nullable(),
    }),
  ),
  skills: z.array(z.string()),
  files: z.array(
    z.object({
      id: Id,
      kind: z.enum(APPLICATION_FILE_KINDS),
      fileName: z.string(),
      contentType: z.string(),
      sizeBytes: z.number().int(),
      downloadUrl: z
        .string()
        .meta({ description: 'This API’s download endpoint for the file (signed on each click).' }),
    }),
  ),
  notes: z.array(Note),
  stageHistory: z.array(
    z.object({
      fromStage: ApplicationStage.nullable(),
      toStage: ApplicationStage,
      changedBy: z.string().nullable(),
      at: DateTime,
    }),
  ),
});

export const StageInput = z.object({ stage: ApplicationStage });
export const NoteInput = z.object({ body: required(5000) });
export const NoteParams = z.object({ id: Id, noteId: Id });
export const FileParams = z.object({ id: Id, fileId: Id });

export const AnalyticsQuery = z.object({ days: z.coerce.number().int().min(7).max(365).default(30) });

export const AnalyticsResponse = z.object({
  totals: z.object({
    applications: z.number().int(),
    publishedJobs: z.number().int(),
    hired: z.number().int(),
    hireRate: z.number().meta({ description: '0–1' }),
    avgPerPublishedJob: z.number(),
  }),
  byStage: StageCounts,
  byDepartment: z.array(z.object({ name: z.string().nullable(), count: z.number().int() })),
  bySource: z.array(z.object({ name: z.string().nullable(), count: z.number().int() })),
  byJob: z.array(z.object({ id: Id, code: z.string(), title: z.string().nullable(), count: z.number().int() })),
  daily: z.array(z.object({ date: z.iso.date(), count: z.number().int() })),
  publishedWithoutApplicants: z.array(z.object({ id: Id, code: z.string(), title: z.string().nullable() })),
});

// --- Site content --------------------------------------------------------------------

const ContentKey = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/, 'a dotted message key, e.g. home.hero.title')
  .max(200)
  .meta({ example: 'home.hero.title' });

export const ContentOverrides = z.object({
  locale: Locale,
  overrides: z
    .record(z.string(), z.string())
    .meta({ description: '{ "home.hero.title": "…" } — merged over the built-in text.' }),
});

export const ContentItems = z.object({
  locale: Locale,
  items: z.array(
    z.object({ key: z.string(), value: z.string(), updatedBy: z.string().nullable(), updatedAt: DateTime }),
  ),
});

export const ContentInput = z.object({ key: ContentKey, locale: Locale, value: z.string().max(5000) });
export const ContentKeyQuery = z.object({ key: ContentKey, locale: Locale });

// --- System --------------------------------------------------------------------------

export const Health = z.object({
  status: z.enum(['ok', 'unreachable']),
  database: z.string().optional(),
  version: z.string().optional(),
  latencyMs: z.number().int(),
  timeZones: z
    .object({
      os: z.string().meta({ example: 'Asia/Bangkok' }),
      app: z.string().meta({ example: 'Asia/Bangkok' }),
      db: z.string().nullable().meta({ example: 'Asia/Bangkok' }),
      standard: z.literal('Asia/Bangkok'),
      ok: z.boolean().meta({ description: 'All three match the standard.' }),
    })
    .meta({ description: 'Company standard: OS, app and database all on Asia/Bangkok.' }),
  clock: z
    .object({
      app: z.string().meta({ example: '2026-10-07T09:15:02.123+07:00' }),
      db: z.string().nullable().meta({ example: '2026-10-07 09:15:02.125+07' }),
    })
    .optional()
    .meta({ description: 'The app’s and the database’s clocks, with offsets — for measuring drift against NTP.' }),
});
