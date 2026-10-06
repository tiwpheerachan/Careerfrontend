import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import {
  applications,
  jobs,
  jobTranslations,
  type JobPublishState,
  type JobRow,
  type JobTranslationRow,
  type Locale,
} from '@/lib/db/schema';
import { NotFoundError, translatePgError } from '@/lib/errors';
import { isUuid, likePattern, pickTranslation } from './support';

/** The text of a job in one language. */
export interface JobText {
  title: string;
  location: string | null;
  description: string | null;
  qualifications: string | null;
}

/** What a visitor sees. No internal ids, no draft/closed jobs. */
export interface PublicJob extends JobText {
  code: string;
  /** The language the text is actually in — may differ from the one asked for when a translation is missing. */
  locale: Locale;
  countryCode: string;
  department: string | null;
  level: string | null;
  quantity: number | null;
  publishedAt: Date | null;
  updatedAt: Date;
}

export interface PublicJobFilter {
  locale: Locale;
  q?: string;
  countryCode?: string;
  department?: string;
  level?: string;
}

/** What the admin edits and sees. */
export interface AdminJob {
  id: string;
  code: string;
  publishState: JobPublishState;
  countryCode: string;
  department: string | null;
  level: string | null;
  quantity: number | null;
  translations: Partial<Record<Locale, JobText>>;
  applicantCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface JobInput {
  code: string;
  publishState: JobPublishState;
  countryCode: string;
  department: string | null;
  level: string | null;
  quantity: number | null;
  /** At least one language. A language left out is removed. */
  translations: Partial<Record<Locale, JobText>>;
}

export interface AdminJobFilter {
  q?: string;
  publishState?: JobPublishState;
}

const live = ne(jobs.status, 'DELETED');
const isPublic = and(live, eq(jobs.publishState, 'PUBLISHED'));

function toPublic(job: JobRow, texts: JobTranslationRow[], locale: Locale): PublicJob | undefined {
  const text = pickTranslation(texts, locale);
  if (!text) return undefined;
  return {
    code: job.code,
    locale: text.locale,
    title: text.title,
    location: text.location,
    description: text.description,
    qualifications: text.qualifications,
    countryCode: job.countryCode,
    department: job.department,
    level: job.level,
    quantity: job.quantity,
    publishedAt: job.publishedAt,
    updatedAt: job.updatedAt,
  };
}

function textsByJob(rows: JobTranslationRow[]): Map<number, JobTranslationRow[]> {
  const map = new Map<number, JobTranslationRow[]>();
  for (const row of rows) map.set(row.jobsPk, [...(map.get(row.jobsPk) ?? []), row]);
  return map;
}

const codeTaken = (code: string) => `A job with code "${code}" already exists.`;

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export function createJobRepository(db: Database) {
  async function translationsOf(jobPks: number[]): Promise<Map<number, JobTranslationRow[]>> {
    if (jobPks.length === 0) return new Map();
    return textsByJob(await db.select().from(jobTranslations).where(inArray(jobTranslations.jobsPk, jobPks)));
  }

  async function adminJobs(where: SQL | undefined): Promise<AdminJob[]> {
    const counts = db
      .select({ jobsPk: applications.jobsPk, n: count().as('n') })
      .from(applications)
      .where(ne(applications.status, 'DELETED'))
      .groupBy(applications.jobsPk)
      .as('counts');

    const rows = await db
      .select({ job: jobs, applicantCount: sql<number>`coalesce(${counts.n}, 0)::int` })
      .from(jobs)
      .leftJoin(counts, eq(counts.jobsPk, jobs.pk))
      .where(where)
      .orderBy(desc(jobs.updatedAt));

    const texts = await translationsOf(rows.map((r) => r.job.pk));
    return rows.map(({ job, applicantCount }) => ({
      id: job.id,
      code: job.code,
      publishState: job.publishState,
      countryCode: job.countryCode,
      department: job.department,
      level: job.level,
      quantity: job.quantity,
      translations: Object.fromEntries(
        (texts.get(job.pk) ?? []).map((t) => [
          t.locale,
          { title: t.title, location: t.location, description: t.description, qualifications: t.qualifications },
        ]),
      ),
      applicantCount,
      publishedAt: job.publishedAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      createdBy: job.createdBy,
      updatedBy: job.updatedBy,
    }));
  }

  async function adminJob(id: string): Promise<AdminJob> {
    if (!isUuid(id)) throw new NotFoundError('job', id);
    const [job] = await adminJobs(and(live, eq(jobs.id, id)));
    if (!job) throw new NotFoundError('job', id);
    return job;
  }

  async function writeTranslations(tx: Transaction, jobsPk: number, translations: JobInput['translations']) {
    await tx.delete(jobTranslations).where(eq(jobTranslations.jobsPk, jobsPk));
    const rows = Object.entries(translations)
      .filter((entry): entry is [Locale, JobText] => entry[1] !== undefined)
      .map(([locale, text]) => ({ jobsPk, locale, ...text }));
    if (rows.length) await tx.insert(jobTranslations).values(rows);
  }

  return {
    // --- Public ---------------------------------------------------------------

    /** Published jobs, newest first, in the asked language (falling back per job). */
    async listPublic(filter: PublicJobFilter): Promise<PublicJob[]> {
      const conditions = [isPublic];
      if (filter.countryCode) conditions.push(eq(jobs.countryCode, filter.countryCode));
      if (filter.department) conditions.push(eq(jobs.department, filter.department));
      if (filter.level) conditions.push(eq(jobs.level, filter.level));
      if (filter.q) {
        const pattern = likePattern(filter.q);
        conditions.push(
          or(
            ilike(jobs.code, pattern),
            ilike(jobs.department, pattern),
            ilike(jobs.level, pattern),
            sql`exists (select 1 from ${jobTranslations} t where t.jobs_pk = ${jobs.pk}
                        and (t.title ilike ${pattern} or t.location ilike ${pattern}))`,
          )!,
        );
      }

      const rows = await db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .orderBy(desc(sql`coalesce(${jobs.publishedAt}, ${jobs.updatedAt})`), asc(jobs.code));
      const texts = await translationsOf(rows.map((r) => r.pk));
      return rows.flatMap((job) => toPublic(job, texts.get(job.pk) ?? [], filter.locale) ?? []);
    },

    /** One published job by its code, or undefined — a draft or closed job is not found. */
    async getPublic(code: string, locale: Locale): Promise<PublicJob | undefined> {
      const [job] = await db
        .select()
        .from(jobs)
        .where(and(isPublic, eq(jobs.code, code.toUpperCase())))
        .limit(1);
      if (!job) return undefined;
      const texts = await translationsOf([job.pk]);
      return toPublic(job, texts.get(job.pk) ?? [], locale);
    },

    /**
     * The values the public filters offer, from every published job — not from
     * the current results. (The old site built them from the filtered list, so
     * picking one country made the others disappear.)
     */
    async publicFacets(): Promise<{ countryCodes: string[]; departments: string[]; levels: string[] }> {
      const rows = await db
        .select({ countryCode: jobs.countryCode, department: jobs.department, level: jobs.level })
        .from(jobs)
        .where(isPublic);
      const distinct = (values: Array<string | null>) =>
        [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
      return {
        countryCodes: distinct(rows.map((r) => r.countryCode)),
        departments: distinct(rows.map((r) => r.department)),
        levels: distinct(rows.map((r) => r.level)),
      };
    },

    /** The pk of a job that is accepting applications, or undefined. Used by the apply path only. */
    async openJobPk(code: string): Promise<number | undefined> {
      const [row] = await db
        .select({ pk: jobs.pk })
        .from(jobs)
        .where(and(isPublic, eq(jobs.code, code.toUpperCase())))
        .limit(1);
      return row?.pk;
    },

    // --- Admin ------------------------------------------------------------------

    async list(filter: AdminJobFilter = {}): Promise<AdminJob[]> {
      const conditions = [live];
      if (filter.publishState) conditions.push(eq(jobs.publishState, filter.publishState));
      if (filter.q) {
        const pattern = likePattern(filter.q);
        conditions.push(
          or(
            ilike(jobs.code, pattern),
            ilike(jobs.department, pattern),
            ilike(jobs.level, pattern),
            ilike(jobs.countryCode, pattern),
            sql`exists (select 1 from ${jobTranslations} t where t.jobs_pk = ${jobs.pk} and t.title ilike ${pattern})`,
          )!,
        );
      }
      return adminJobs(and(...conditions));
    },

    get: adminJob,

    /** Distinct values already in use, for the editor's autocomplete. */
    async options(): Promise<{ countryCodes: string[]; departments: string[]; levels: string[] }> {
      const rows = await db
        .select({ countryCode: jobs.countryCode, department: jobs.department, level: jobs.level })
        .from(jobs)
        .where(live);
      const distinct = (values: Array<string | null>) =>
        [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
      return {
        countryCodes: distinct(rows.map((r) => r.countryCode)),
        departments: distinct(rows.map((r) => r.department)),
        levels: distinct(rows.map((r) => r.level)),
      };
    },

    async create(input: JobInput, actor: string | null): Promise<AdminJob> {
      try {
        const id = await db.transaction(async (tx) => {
          const [job] = await tx
            .insert(jobs)
            .values({
              code: input.code,
              publishState: input.publishState,
              countryCode: input.countryCode,
              department: input.department,
              level: input.level,
              quantity: input.quantity,
              createdBy: actor,
              updatedBy: actor,
            })
            .returning({ pk: jobs.pk, id: jobs.id });
          await writeTranslations(tx, job!.pk, input.translations);
          return job!.id;
        });
        return adminJob(id);
      } catch (error) {
        translatePgError(error, { conflict: codeTaken(input.code) });
      }
    },

    /** Replaces every editable field — a full PUT. Fields left null are cleared on purpose. */
    async update(id: string, input: JobInput, actor: string | null): Promise<AdminJob> {
      if (!isUuid(id)) throw new NotFoundError('job', id);
      try {
        await db.transaction(async (tx) => {
          const [job] = await tx
            .update(jobs)
            .set({
              code: input.code,
              publishState: input.publishState,
              countryCode: input.countryCode,
              department: input.department,
              level: input.level,
              quantity: input.quantity,
              updatedBy: actor,
            })
            .where(and(live, eq(jobs.id, id)))
            .returning({ pk: jobs.pk });
          if (!job) throw new NotFoundError('job', id);
          await writeTranslations(tx, job.pk, input.translations);
        });
      } catch (error) {
        translatePgError(error, { conflict: codeTaken(input.code) });
      }
      return adminJob(id);
    },

    async setPublishState(id: string, publishState: JobPublishState, actor: string | null): Promise<AdminJob> {
      if (!isUuid(id)) throw new NotFoundError('job', id);
      const [row] = await db
        .update(jobs)
        .set({ publishState, updatedBy: actor })
        .where(and(live, eq(jobs.id, id)))
        .returning({ id: jobs.id });
      if (!row) throw new NotFoundError('job', id);
      return adminJob(id);
    },

    /**
     * Soft delete. Applicants stay, still pointing at the job (the old hard
     * delete orphaned them); the code becomes free for a new job.
     */
    async softDelete(id: string, actor: string | null): Promise<void> {
      if (!isUuid(id)) throw new NotFoundError('job', id);
      const [row] = await db
        .update(jobs)
        .set({ status: 'DELETED', deletedAt: new Date(), deletedBy: actor, updatedBy: actor })
        .where(and(live, eq(jobs.id, id)))
        .returning({ id: jobs.id });
      if (!row) throw new NotFoundError('job', id);
    },
  };
}

export type JobRepository = ReturnType<typeof createJobRepository>;
