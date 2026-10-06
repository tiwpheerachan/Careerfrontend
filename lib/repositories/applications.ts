import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import {
  applicationEducations,
  applicationExperiences,
  applicationFiles,
  applicationNotes,
  applications,
  applicationSkills,
  applicationStageChanges,
  jobs,
  jobTranslations,
  type ApplicationFileKind,
  type ApplicationStage,
  type EducationLevel,
  type Locale,
} from '@/lib/db/schema';
import { NotFoundError } from '@/lib/errors';
import { isUuid, JOBS_PK, likePattern, offsetOf, type Page } from './support';

// --- Inputs --------------------------------------------------------------------

/** "2024-03" — what the form's month picker produces. */
type YearMonth = string;

export interface ApplicationFileInput {
  kind: ApplicationFileKind;
  /** Path inside the private bucket, already uploaded. */
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ApplicationInput {
  locale: Locale;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  residenceCountry: string | null;
  address: string | null;
  visaRequired: boolean;
  /** YYYY-MM-DD */
  availableFrom: string | null;
  websiteUrl: string | null;
  sourceChannel: string | null;
  educations: Array<{
    level: EducationLevel | null;
    institute: string | null;
    program: string | null;
    startMonth: YearMonth | null;
    endMonth: YearMonth | null;
    gpa: string | null;
  }>;
  experiences: Array<{
    company: string | null;
    role: string | null;
    startMonth: YearMonth | null;
    endMonth: YearMonth | null;
  }>;
  skills: string[];
  files: ApplicationFileInput[];
}

export const APPLICATION_SORTS = ['createdAt', 'name', 'stage', 'job'] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

export interface ApplicationFilter extends Page {
  q?: string;
  stage?: ApplicationStage;
  /** The job's public id. */
  jobId?: string;
  /** Newest first unless said otherwise. */
  sort?: ApplicationSort;
  dir?: 'asc' | 'desc';
}

// --- Outputs -------------------------------------------------------------------

export interface JobSummary {
  id: string;
  code: string;
  /** Thai title, else whichever exists. */
  title: string | null;
  department: string | null;
  level: string | null;
  countryCode: string;
}

export interface ApplicationListItem {
  id: string;
  stage: ApplicationStage;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sourceChannel: string | null;
  createdAt: Date;
  stageChangedAt: Date | null;
  job: JobSummary;
}

export interface ApplicationDetail extends ApplicationListItem {
  locale: Locale;
  residenceCountry: string | null;
  address: string | null;
  visaRequired: boolean;
  availableFrom: string | null;
  websiteUrl: string | null;
  termsAcceptedAt: Date;
  stageChangedBy: string | null;
  educations: ApplicationInput['educations'];
  experiences: ApplicationInput['experiences'];
  skills: string[];
  files: Array<{
    id: string;
    kind: ApplicationFileKind;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    storagePath: string;
  }>;
  notes: Array<{ id: string; body: string; createdBy: string | null; createdAt: Date }>;
  stageHistory: Array<{
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    changedBy: string | null;
    at: Date;
  }>;
}

export interface Analytics {
  totals: { applications: number; publishedJobs: number; hired: number; hireRate: number; avgPerPublishedJob: number };
  byStage: Record<ApplicationStage, number>;
  byDepartment: Array<{ name: string | null; count: number }>;
  bySource: Array<{ name: string | null; count: number }>;
  byJob: Array<{ id: string; code: string; title: string | null; count: number }>;
  /** One entry per day, oldest first, zero-filled, in the given time zone. */
  daily: Array<{ date: string; count: number }>;
  /** Published jobs nobody has applied to yet. */
  publishedWithoutApplicants: Array<{ id: string; code: string; title: string | null }>;
}

const STAGES: ApplicationStage[] = ['NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'];

// "2024-03" <-> "2024-03-01"
const toMonthDate = (ym: YearMonth | null) => (ym ? `${ym}-01` : null);
const fromMonthDate = (date: string | null) => (date ? date.slice(0, 7) : null);

const live = ne(applications.status, 'DELETED');

/**
 * ORDER BY for a list. Names sort in C collation (byte order, with an index
 * behind it — same rule as onelink) and every order ends on pk, so a page
 * boundary never moves between two rows that tie.
 */
function orderOf(sort: ApplicationSort = 'createdAt', dir: 'asc' | 'desc' = sort === 'createdAt' ? 'desc' : 'asc') {
  const by = dir === 'asc' ? asc : desc;
  const keys = {
    createdAt: [by(applications.createdAt)],
    name: [by(sql`${applications.firstName} collate "C"`), by(sql`${applications.lastName} collate "C"`)],
    // The enum's own order: NEW → REVIEWING → SHORTLISTED → REJECTED → HIRED.
    stage: [by(applications.stage), desc(applications.createdAt)],
    job: [by(sql`${jobs.code} collate "C"`), desc(applications.createdAt)],
  }[sort];
  return [...keys, by(applications.pk)];
}

/** A job's title for admin lists: Thai, else English, else Chinese. */
const jobTitle = sql<string | null>`(
  select t.title from ${jobTranslations} t where t.jobs_pk = ${JOBS_PK}
  order by array_position(array['th','en','zh']::locale[], t.locale) limit 1
)`;

const listColumns = {
  id: applications.id,
  stage: applications.stage,
  firstName: applications.firstName,
  lastName: applications.lastName,
  email: applications.email,
  phone: applications.phone,
  sourceChannel: applications.sourceChannel,
  createdAt: applications.createdAt,
  stageChangedAt: applications.stageChangedAt,
  job: {
    id: jobs.id,
    code: jobs.code,
    title: jobTitle,
    department: jobs.department,
    level: jobs.level,
    countryCode: jobs.countryCode,
  },
};

export function createApplicationRepository(db: Database) {
  function conditions(filter: Omit<ApplicationFilter, 'page' | 'pageSize'>, withStage: boolean): SQL | undefined {
    const parts: SQL[] = [live];
    if (withStage && filter.stage) parts.push(eq(applications.stage, filter.stage));
    if (filter.jobId) parts.push(isUuid(filter.jobId) ? eq(jobs.id, filter.jobId) : sql`false`);
    if (filter.q) {
      const pattern = likePattern(filter.q.trim());
      parts.push(
        or(
          ilike(applications.firstName, pattern),
          ilike(applications.lastName, pattern),
          ilike(sql`${applications.firstName} || ' ' || ${applications.lastName}`, pattern),
          ilike(applications.email, pattern),
          ilike(applications.phone, pattern),
        )!,
      );
    }
    return and(...parts);
  }

  async function pkOf(id: string): Promise<number> {
    if (!isUuid(id)) throw new NotFoundError('application', id);
    const [row] = await db
      .select({ pk: applications.pk })
      .from(applications)
      .where(and(live, eq(applications.id, id)))
      .limit(1);
    if (!row) throw new NotFoundError('application', id);
    return row.pk;
  }

  return {
    /**
     * Saves an application and everything attached to it in one transaction:
     * either all of it is there, or none of it. (The old backend inserted the
     * row first and the rest after, so a failure half way left a partial
     * application behind, and a retry made a duplicate.)
     *
     * `jobsPk` must come from jobs.openJobPk() — a published job.
     */
    async create(jobsPk: number, input: ApplicationInput): Promise<{ id: string }> {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(applications)
          .values({
            jobsPk,
            locale: input.locale,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            residenceCountry: input.residenceCountry,
            address: input.address,
            visaRequired: input.visaRequired,
            availableFrom: input.availableFrom,
            websiteUrl: input.websiteUrl,
            sourceChannel: input.sourceChannel,
            termsAcceptedAt: new Date(),
          })
          .returning({ pk: applications.pk, id: applications.id });
        const applicationsPk = row!.pk;

        if (input.educations.length) {
          await tx.insert(applicationEducations).values(
            input.educations.map((e, position) => ({
              applicationsPk,
              position,
              level: e.level,
              institute: e.institute,
              program: e.program,
              startMonth: toMonthDate(e.startMonth),
              endMonth: toMonthDate(e.endMonth),
              gpa: e.gpa,
            })),
          );
        }
        if (input.experiences.length) {
          await tx.insert(applicationExperiences).values(
            input.experiences.map((e, position) => ({
              applicationsPk,
              position,
              company: e.company,
              role: e.role,
              startMonth: toMonthDate(e.startMonth),
              endMonth: toMonthDate(e.endMonth),
            })),
          );
        }
        if (input.skills.length) {
          await tx
            .insert(applicationSkills)
            .values(input.skills.map((skill, position) => ({ applicationsPk, position, skill })));
        }
        if (input.files.length) {
          await tx.insert(applicationFiles).values(input.files.map((f) => ({ applicationsPk, ...f })));
        }
        return { id: row!.id };
      });
    },

    /** One page, newest first, plus how many match per stage (for the filter chips). */
    async list(
      filter: ApplicationFilter,
    ): Promise<{ rows: ApplicationListItem[]; total: number; stageCounts: Record<ApplicationStage, number> }> {
      const where = conditions(filter, true);
      const [rows, totals, perStage] = await Promise.all([
        db
          .select(listColumns)
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(where)
          .orderBy(...orderOf(filter.sort, filter.dir))
          .limit(filter.pageSize)
          .offset(offsetOf(filter)),
        db.select({ n: count() }).from(applications).innerJoin(jobs, eq(jobs.pk, applications.jobsPk)).where(where),
        db
          .select({ stage: applications.stage, n: count() })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(conditions(filter, false))
          .groupBy(applications.stage),
      ]);
      const stageCounts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<ApplicationStage, number>;
      for (const { stage, n } of perStage) stageCounts[stage] = n;
      return { rows, total: totals[0]?.n ?? 0, stageCounts };
    },

    /** Every match, for CSV export — no page and no row cap (the old export stopped at 1000). */
    async exportRows(filter: Omit<ApplicationFilter, 'page' | 'pageSize'>) {
      return db
        .select({
          ...listColumns,
          residenceCountry: applications.residenceCountry,
          address: applications.address,
          visaRequired: applications.visaRequired,
          availableFrom: applications.availableFrom,
          websiteUrl: applications.websiteUrl,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
        .where(conditions(filter, true))
        .orderBy(...orderOf(filter.sort, filter.dir));
    },

    async get(id: string): Promise<ApplicationDetail> {
      if (!isUuid(id)) throw new NotFoundError('application', id);
      const [row] = await db
        .select({
          ...listColumns,
          pk: applications.pk,
          locale: applications.locale,
          residenceCountry: applications.residenceCountry,
          address: applications.address,
          visaRequired: applications.visaRequired,
          availableFrom: applications.availableFrom,
          websiteUrl: applications.websiteUrl,
          termsAcceptedAt: applications.termsAcceptedAt,
          stageChangedBy: applications.stageChangedBy,
        })
        .from(applications)
        .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
        .where(and(live, eq(applications.id, id)))
        .limit(1);
      if (!row) throw new NotFoundError('application', id);
      const { pk, ...application } = row;

      const [educations, experiences, skills, files, notes, history] = await Promise.all([
        db
          .select()
          .from(applicationEducations)
          .where(eq(applicationEducations.applicationsPk, pk))
          .orderBy(asc(applicationEducations.position)),
        db
          .select()
          .from(applicationExperiences)
          .where(eq(applicationExperiences.applicationsPk, pk))
          .orderBy(asc(applicationExperiences.position)),
        db
          .select({ skill: applicationSkills.skill })
          .from(applicationSkills)
          .where(eq(applicationSkills.applicationsPk, pk))
          .orderBy(asc(applicationSkills.position)),
        db
          .select({
            id: applicationFiles.id,
            kind: applicationFiles.kind,
            fileName: applicationFiles.fileName,
            contentType: applicationFiles.contentType,
            sizeBytes: applicationFiles.sizeBytes,
            storagePath: applicationFiles.storagePath,
          })
          .from(applicationFiles)
          .where(eq(applicationFiles.applicationsPk, pk))
          .orderBy(asc(applicationFiles.kind), asc(applicationFiles.pk)),
        db
          .select({
            id: applicationNotes.id,
            body: applicationNotes.body,
            createdBy: applicationNotes.createdBy,
            createdAt: applicationNotes.createdAt,
          })
          .from(applicationNotes)
          .where(and(eq(applicationNotes.applicationsPk, pk), ne(applicationNotes.status, 'DELETED')))
          .orderBy(desc(applicationNotes.createdAt)),
        db
          .select({
            fromStage: applicationStageChanges.fromStage,
            toStage: applicationStageChanges.toStage,
            changedBy: applicationStageChanges.changedBy,
            at: applicationStageChanges.createdAt,
          })
          .from(applicationStageChanges)
          .where(eq(applicationStageChanges.applicationsPk, pk))
          .orderBy(asc(applicationStageChanges.createdAt), asc(applicationStageChanges.pk)),
      ]);

      return {
        ...application,
        educations: educations.map((e) => ({
          level: e.level,
          institute: e.institute,
          program: e.program,
          startMonth: fromMonthDate(e.startMonth),
          endMonth: fromMonthDate(e.endMonth),
          gpa: e.gpa,
        })),
        experiences: experiences.map((e) => ({
          company: e.company,
          role: e.role,
          startMonth: fromMonthDate(e.startMonth),
          endMonth: fromMonthDate(e.endMonth),
        })),
        skills: skills.map((s) => s.skill),
        files,
        notes,
        stageHistory: history,
      };
    },

    /** One file of one application — for the download endpoint. */
    async file(id: string, fileId: string) {
      const applicationsPk = await pkOf(id);
      if (!isUuid(fileId)) throw new NotFoundError('file', fileId);
      const [row] = await db
        .select({
          storagePath: applicationFiles.storagePath,
          fileName: applicationFiles.fileName,
          contentType: applicationFiles.contentType,
        })
        .from(applicationFiles)
        .where(and(eq(applicationFiles.applicationsPk, applicationsPk), eq(applicationFiles.id, fileId)))
        .limit(1);
      if (!row) throw new NotFoundError('file', fileId);
      return row;
    },

    /** Moves an application to a stage. The history row and stage_changed_at come from triggers. */
    async setStage(id: string, stage: ApplicationStage, actor: string | null): Promise<void> {
      const pk = await pkOf(id);
      await db
        .update(applications)
        .set({ stage, stageChangedBy: actor })
        .where(and(eq(applications.pk, pk), ne(applications.stage, stage)));
    },

    async addNote(id: string, body: string, actor: string | null) {
      const applicationsPk = await pkOf(id);
      const [note] = await db.insert(applicationNotes).values({ applicationsPk, body, createdBy: actor }).returning({
        id: applicationNotes.id,
        body: applicationNotes.body,
        createdBy: applicationNotes.createdBy,
        createdAt: applicationNotes.createdAt,
      });
      return note!;
    },

    async deleteNote(id: string, noteId: string, actor: string | null): Promise<void> {
      const applicationsPk = await pkOf(id);
      if (!isUuid(noteId)) throw new NotFoundError('note', noteId);
      const [row] = await db
        .update(applicationNotes)
        .set({ status: 'DELETED', deletedAt: new Date(), deletedBy: actor })
        .where(
          and(
            eq(applicationNotes.applicationsPk, applicationsPk),
            eq(applicationNotes.id, noteId),
            ne(applicationNotes.status, 'DELETED'),
          ),
        )
        .returning({ id: applicationNotes.id });
      if (!row) throw new NotFoundError('note', noteId);
    },

    async softDelete(id: string, actor: string | null): Promise<void> {
      const pk = await pkOf(id);
      await db
        .update(applications)
        .set({ status: 'DELETED', deletedAt: new Date(), deletedBy: actor })
        .where(eq(applications.pk, pk));
    },

    /** The dashboard. Every number is counted in SQL over all rows. */
    async analytics(options: { days: number; timeZone: string }): Promise<Analytics> {
      const { days, timeZone } = options;
      const appsLive = and(live, ne(jobs.status, 'DELETED'));

      const [stageRows, departmentRows, sourceRows, jobRows, dailyRows, publishedRows, emptyRows] = await Promise.all([
        db
          .select({ stage: applications.stage, n: count() })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(appsLive)
          .groupBy(applications.stage),
        db
          .select({ name: jobs.department, n: count() })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(appsLive)
          .groupBy(jobs.department)
          .orderBy(desc(count())),
        db
          .select({ name: sql<string | null>`nullif(btrim(${applications.sourceChannel}), '')`, n: count() })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(appsLive)
          .groupBy(sql`nullif(btrim(${applications.sourceChannel}), '')`)
          .orderBy(desc(count())),
        db
          .select({ id: jobs.id, code: jobs.code, title: jobTitle, n: count() })
          .from(applications)
          .innerJoin(jobs, eq(jobs.pk, applications.jobsPk))
          .where(appsLive)
          .groupBy(jobs.pk, jobs.id, jobs.code)
          .orderBy(desc(count()), asc(jobs.code))
          .limit(20),
        db.execute(sql`
          with days as (
            select generate_series(
              (now() at time zone ${timeZone})::date - (${days - 1})::int,
              (now() at time zone ${timeZone})::date,
              interval '1 day'
            )::date as day
          )
          select to_char(d.day, 'YYYY-MM-DD') as date, count(a.pk)::int as count
          from days d
          left join ${applications} a
            on (a.created_at at time zone ${timeZone})::date = d.day and a.status <> 'DELETED'
          group by d.day order by d.day
        `) as unknown as Promise<Array<{ date: string; count: number }>>,
        db
          .select({ n: count() })
          .from(jobs)
          .where(and(ne(jobs.status, 'DELETED'), eq(jobs.publishState, 'PUBLISHED'))),
        db
          .select({ id: jobs.id, code: jobs.code, title: jobTitle })
          .from(jobs)
          .where(
            and(
              ne(jobs.status, 'DELETED'),
              eq(jobs.publishState, 'PUBLISHED'),
              sql`not exists (select 1 from ${applications} a where a.jobs_pk = ${JOBS_PK} and a.status <> 'DELETED')`,
            ),
          )
          .orderBy(asc(jobs.code)),
      ]);

      const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<ApplicationStage, number>;
      for (const { stage, n } of stageRows) byStage[stage] = n;
      const total = STAGES.reduce((sum, s) => sum + byStage[s], 0);
      const publishedJobs = publishedRows[0]?.n ?? 0;

      return {
        totals: {
          applications: total,
          publishedJobs,
          hired: byStage.HIRED,
          hireRate: total ? byStage.HIRED / total : 0,
          avgPerPublishedJob: publishedJobs ? Math.round((total / publishedJobs) * 10) / 10 : 0,
        },
        byStage,
        byDepartment: departmentRows.map((r) => ({ name: r.name, count: r.n })),
        bySource: sourceRows.map((r) => ({ name: r.name, count: r.n })),
        byJob: jobRows.map((r) => ({ id: r.id, code: r.code, title: r.title, count: r.n })),
        daily: dailyRows.map((r) => ({ date: r.date, count: Number(r.count) })),
        publishedWithoutApplicants: emptyRows,
      };
    },
  };
}

export type ApplicationRepository = ReturnType<typeof createApplicationRepository>;
