/**
 * Import the old system's data into this database.
 *
 *   npm run db:dev:import-legacy  [-- --dry-run]
 *   npm run db:prod:import-legacy [-- --dry-run]     (asks you to type "production")
 *
 * SOURCE: a LOCAL copy of the old database, never the old project itself —
 * old-dump/old-schema.sql + old-data.sql (a read-only pg_dump of Supabase
 * project yqofedmxrrurpjfaocys) loaded into the dev container as
 * `old_snapshot`. Override with OLD_SNAPSHOT_URL; a non-local url is refused.
 *
 * FILES: résumés and attachments are fetched from the old project's PUBLIC
 * bucket with plain GETs (read-only) and stored in THIS target's storage:
 * the local .storage/ folder for dev, the private Supabase bucket for prod.
 *
 * Safe to run again: a job already imported (same legacy_code) and an
 * application already imported (same id — old uuids are kept) are skipped.
 * Everything is checked before anything is written; each application and its
 * children go in one transaction. The value mapping is lib/legacy/map.ts.
 */
import { and, eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { assertMayTouch, describeTarget, targetLabel } from './db-target.mjs';
import { createDatabase } from '@/lib/db/client';
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
  siteContent,
  type ApplicationFileKind,
  type Locale,
} from '@/lib/db/schema';
import { CONTENT_TYPES, cleanFileName, sniff } from '@/lib/files';
import * as map from '@/lib/legacy/map';
import type { ObjectStore } from '@/lib/storage';
import { createLocalStore } from '@/lib/storage/local';
import { createSupabaseStore } from '@/lib/storage/supabase';

const DRY_RUN = process.argv.includes('--dry-run');
const ACTOR = 'import (old system)';

// --- Where from, where to -------------------------------------------------------------

const sourceUrl = process.env.OLD_SNAPSHOT_URL || 'postgresql://root:dev_pass@127.0.0.1:55434/old_snapshot';
if (!describeTarget(sourceUrl).local) {
  throw new Error(
    'OLD_SNAPSHOT_URL must be a LOCAL copy of the old database. This script never reads the old project.',
  );
}
const targetUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!targetUrl) throw new Error('DATABASE_URL is not set.');
const target = assertMayTouch(targetUrl, 'import-legacy');

function storageOf(): ObjectStore {
  if ((process.env.STORAGE_DRIVER || 'local') === 'supabase') {
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!origin || !key)
      throw new Error('STORAGE_DRIVER=supabase needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    if (origin.includes('yqofedmxrrurpjfaocys')) throw new Error('Refusing to write files into the OLD project.');
    return createSupabaseStore({ origin, key, bucket: process.env.STORAGE_BUCKET || 'applications' });
  }
  return createLocalStore(process.env.LOCAL_STORAGE_DIR || '.storage');
}

// --- The old rows ----------------------------------------------------------------------

interface OldJobRow extends map.OldJob {
  status: string | null;
  country: string | null;
  department: string | null;
  level: string | null;
  quantity: number | null;
  created_at: Date;
  updated_at: Date | null;
}
interface OldApplicationRow {
  id: string;
  job_id: string | null;
  country: string | null;
  department: string | null;
  level: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  visa_required: boolean | null;
  available_start_date: string | null;
  website_url: string | null;
  source_channel: string | null;
  terms_accepted: boolean | null;
  resume_url: string | null;
  transcript_url: string | null;
  status: string | null;
  admin_note: string | null;
  reviewed_at: Date | null;
  created_at: Date;
}

const old = postgres(sourceUrl, { max: 1, onnotice: () => {} });
const db = createDatabase(targetUrl, { max: 2 });
const counts = {
  jobsNew: 0,
  jobsKept: 0,
  placeholders: 0,
  appsNew: 0,
  appsKept: 0,
  files: 0,
  filesMissing: 0,
  content: 0,
};
const problems: string[] = [];

async function fetchOldFile(url: string): Promise<Uint8Array | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

try {
  console.log(
    `${DRY_RUN ? 'DRY RUN — nothing is written. ' : ''}Importing ${targetLabel(describeTarget(sourceUrl))} → ${targetLabel(target)}`,
  );

  const oldJobs = await old<OldJobRow[]>`select * from jobs order by created_at, job_id`;
  const oldApps = await old<OldApplicationRow[]>`select * from applications order by created_at, id`;
  const oldEdu = await old`select * from application_educations order by application_id, id`;
  const oldExp = await old`select * from application_experiences order by application_id, id`;
  const oldSkills = await old`select * from application_skills order by application_id, id`;
  const oldAtt = await old`select * from application_attachments order by application_id, id`;
  const oldContent = await old`select * from site_content order by key, lang`;
  const byApp = <T extends { application_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.application_id, [...(m.get(r.application_id) ?? []), r]);
    return m;
  };
  const eduOf = byApp(oldEdu as unknown as Array<{ application_id: string } & Record<string, string | null>>);
  const expOf = byApp(oldExp as unknown as Array<{ application_id: string } & Record<string, string | null>>);
  const skillsOf = byApp(oldSkills as unknown as Array<{ application_id: string; skill: string | null }>);
  const attOf = byApp(
    oldAtt as unknown as Array<{ application_id: string; file_name: string | null; file_url: string | null }>,
  );
  console.log(`old: ${oldJobs.length} jobs, ${oldApps.length} applications, ${oldContent.length} content overrides`);

  // --- 1. Check everything first ----------------------------------------------------------

  // Applications pointing at a job_id the old jobs table does not have get a
  // CLOSED placeholder job, so nothing is lost (agreed with the owner).
  const known = new Set(oldJobs.map((j) => j.job_id));
  const orphanJobIds = [...new Set(oldApps.map((a) => a.job_id ?? '').filter((id) => !known.has(id)))];

  const plannedCodes = new Map<string, string>(); // code -> old job_id
  const planJob = (jobId: string) => {
    const code = map.cleanJobCode(jobId || 'UNKNOWN-JOB');
    const other = plannedCodes.get(code);
    if (other !== undefined && other !== jobId)
      problems.push(`two old jobs become the same code ${code}: "${other}" and "${jobId}"`);
    plannedCodes.set(code, jobId);
    return code;
  };
  for (const j of oldJobs) {
    planJob(j.job_id);
    map.countryCodeOf(j.country); // throws on an unknown country
    if (!Object.keys(map.translationsOf(j)).length) problems.push(`job "${j.job_id}" has no text in any language`);
  }
  for (const id of orphanJobIds) planJob(id);

  // A planned code already used in the target by a DIFFERENT job.
  for (const [code, jobId] of plannedCodes) {
    const [clash] = await db
      .select({ legacy: jobs.legacyCode })
      .from(jobs)
      .where(and(eq(jobs.code, code), sql`status <> 'DELETED'`))
      .limit(1);
    if (clash && clash.legacy?.trim().toLowerCase() !== jobId.trim().toLowerCase()) {
      problems.push(`code ${code} (old "${jobId}") is already used by another job in the target`);
    }
  }
  if (problems.length) {
    console.error('Not imported — fix these first:\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log(`checked: ${plannedCodes.size} job codes (${orphanJobIds.length} placeholder), no clashes`);

  // --- 2. Jobs -----------------------------------------------------------------------------

  const jobPkByOldId = new Map<string, number>();
  const findImported = async (jobId: string) =>
    (
      await db
        .select({ pk: jobs.pk })
        .from(jobs)
        .where(sql`lower(btrim(${jobs.legacyCode})) = lower(btrim(${jobId})) and ${jobs.status} <> 'DELETED'`)
        .limit(1)
    )[0]?.pk;

  for (const j of oldJobs) {
    const existing = await findImported(j.job_id);
    if (existing) {
      jobPkByOldId.set(j.job_id, existing);
      counts.jobsKept++;
      continue;
    }
    counts.jobsNew++;
    if (DRY_RUN) continue;
    const publishState = map.publishStateOf(j.status);
    const pk = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(jobs)
        .values({
          code: map.cleanJobCode(j.job_id),
          legacyCode: j.job_id,
          publishState,
          countryCode: map.countryCodeOf(j.country),
          department: map.text(j.department),
          level: map.text(j.level),
          quantity: j.quantity !== null && j.quantity >= 0 ? j.quantity : null,
          publishedAt: publishState === 'PUBLISHED' ? j.created_at : null,
          createdBy: ACTOR,
          updatedBy: ACTOR,
          createdAt: j.created_at,
          updatedAt: j.updated_at ?? j.created_at,
        })
        .returning({ pk: jobs.pk });
      const texts = Object.entries(map.translationsOf(j)).map(([locale, t]) => ({
        jobsPk: row!.pk,
        locale: locale as Locale,
        ...t!,
      }));
      if (texts.length) await tx.insert(jobTranslations).values(texts);
      return row!.pk;
    });
    jobPkByOldId.set(j.job_id, pk);
  }

  for (const jobId of orphanJobIds) {
    const existing = await findImported(jobId);
    if (existing) {
      jobPkByOldId.set(jobId, existing);
      counts.jobsKept++;
      continue;
    }
    counts.placeholders++;
    if (DRY_RUN) continue;
    const first = oldApps.find((a) => (a.job_id ?? '') === jobId)!;
    const [row] = await db
      .insert(jobs)
      .values({
        code: map.cleanJobCode(jobId || 'UNKNOWN-JOB'),
        legacyCode: jobId,
        publishState: 'CLOSED',
        countryCode: map.countryCodeOf(first.country ?? 'Thailand'),
        department: map.text(first.department),
        level: map.text(first.level),
        createdBy: ACTOR,
        updatedBy: ACTOR,
        createdAt: first.created_at,
        updatedAt: first.created_at,
      })
      .returning({ pk: jobs.pk });
    await db.insert(jobTranslations).values([
      {
        jobsPk: row!.pk,
        locale: 'th',
        title: `ตำแหน่งจากระบบเดิม (${jobId})`,
        location: null,
        description: null,
        qualifications: null,
      },
      {
        jobsPk: row!.pk,
        locale: 'en',
        title: `Position from the old system (${jobId})`,
        location: null,
        description: null,
        qualifications: null,
      },
    ]);
    jobPkByOldId.set(jobId, row!.pk);
  }

  // --- 3. Applications ---------------------------------------------------------------------

  const objects = DRY_RUN ? null : storageOf();
  for (const a of oldApps) {
    const [already] = await db
      .select({ pk: applications.pk })
      .from(applications)
      .where(eq(applications.id, a.id))
      .limit(1);
    if (already) {
      counts.appsKept++;
      continue;
    }
    counts.appsNew++;

    // Files first — from the old public bucket, into this target's storage.
    const wanted: Array<{ kind: ApplicationFileKind; url: string; name: string }> = [];
    const resume = map.oldFileOf(a.resume_url);
    if (resume) wanted.push({ kind: 'RESUME', ...resume });
    const transcript = map.oldFileOf(a.transcript_url);
    if (transcript) wanted.push({ kind: 'TRANSCRIPT', ...transcript });
    for (const att of attOf.get(a.id) ?? []) {
      const file = map.oldFileOf(att.file_url, att.file_name);
      if (file) wanted.push({ kind: 'ATTACHMENT', ...file });
    }

    const files: Array<typeof applicationFiles.$inferInsert> = [];
    const index: Record<ApplicationFileKind, number> = { RESUME: 0, TRANSCRIPT: 0, ATTACHMENT: 0 };
    for (const w of wanted) {
      const bytes = await fetchOldFile(w.url);
      if (!bytes || bytes.byteLength === 0) {
        counts.filesMissing++;
        problems.push(`application ${a.id}: could not fetch ${w.kind.toLowerCase()} "${w.name}"`);
        continue;
      }
      counts.files++;
      if (DRY_RUN) continue;
      const type = sniff(bytes);
      const extension = type ?? 'bin';
      const contentType = type ? CONTENT_TYPES[type] : 'application/octet-stream';
      // Deterministic, so a re-run after a failure overwrites rather than piles up.
      const storagePath = `legacy/${a.id}/${w.kind.toLowerCase()}-${index[w.kind]++}.${extension}`;
      await objects!.remove([storagePath]).catch(() => {});
      await objects!.put(storagePath, bytes, contentType);
      files.push({
        applicationsPk: 0,
        kind: w.kind,
        storagePath,
        fileName: cleanFileName(w.name),
        contentType,
        sizeBytes: bytes.byteLength,
      });
    }
    if (DRY_RUN) continue;

    const stage = map.stageOf(a.status);
    const changedAt = stage === 'NEW' ? null : (a.reviewed_at ?? a.created_at);
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(applications)
        .values({
          id: a.id,
          jobsPk: jobPkByOldId.get(a.job_id ?? '')!,
          stage,
          stageChangedAt: changedAt,
          stageChangedBy: stage === 'NEW' ? null : ACTOR,
          locale: 'th',
          firstName: map.text(a.first_name) ?? '—',
          lastName: map.text(a.last_name) ?? '—',
          email: (a.email ?? '').trim(),
          phone: map.text(a.phone) ?? '—',
          residenceCountry: null,
          address: map.text(a.address),
          visaRequired: Boolean(a.visa_required),
          availableFrom: map.dateOf(a.available_start_date),
          websiteUrl: map.websiteOf(a.website_url),
          sourceChannel: map.text(a.source_channel),
          termsAcceptedAt: a.created_at,
          createdAt: a.created_at,
          updatedAt: a.reviewed_at ?? a.created_at,
        })
        .returning({ pk: applications.pk });
      const pk = row!.pk;

      // The insert trigger wrote one history row dated now(); date it when the person applied.
      await tx
        .update(applicationStageChanges)
        .set({ createdAt: changedAt ?? a.created_at, changedBy: stage === 'NEW' ? null : ACTOR })
        .where(eq(applicationStageChanges.applicationsPk, pk));

      const edu = eduOf.get(a.id) ?? [];
      if (edu.length) {
        await tx.insert(applicationEducations).values(
          edu.map((e, position) => ({
            applicationsPk: pk,
            position,
            level: map.educationLevelOf(e.degree_level ?? null),
            institute: map.text(e.institute),
            program: map.text(e.program),
            startMonth: map.yearMonthOf(e.start_month ?? null) && `${map.yearMonthOf(e.start_month ?? null)}-01`,
            endMonth: map.yearMonthOf(e.end_month ?? null) && `${map.yearMonthOf(e.end_month ?? null)}-01`,
            gpa: map.text(e.gpa),
          })),
        );
      }
      const exp = expOf.get(a.id) ?? [];
      if (exp.length) {
        await tx.insert(applicationExperiences).values(
          exp.map((e, position) => ({
            applicationsPk: pk,
            position,
            company: map.text(e.company),
            role: map.text(e.role),
            startMonth: map.yearMonthOf(e.start_month ?? null) && `${map.yearMonthOf(e.start_month ?? null)}-01`,
            endMonth: map.yearMonthOf(e.end_month ?? null) && `${map.yearMonthOf(e.end_month ?? null)}-01`,
          })),
        );
      }
      const skills = map.skillsOf((skillsOf.get(a.id) ?? []).map((s) => s.skill));
      if (skills.length) {
        await tx
          .insert(applicationSkills)
          .values(skills.map((skill, position) => ({ applicationsPk: pk, position, skill })));
      }
      if (files.length) await tx.insert(applicationFiles).values(files.map((f) => ({ ...f, applicationsPk: pk })));
      const note = map.text(a.admin_note);
      if (note) {
        await tx.insert(applicationNotes).values({
          applicationsPk: pk,
          body: note,
          createdBy: ACTOR,
          createdAt: a.reviewed_at ?? a.created_at,
        });
      }
    });
  }

  // --- 4. Site text overrides --------------------------------------------------------------

  for (const c of oldContent as unknown as Array<{
    key: string;
    lang: string;
    value: unknown;
    updated_by: string | null;
  }>) {
    if (!['th', 'en', 'zh'].includes(c.lang) || !/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/.test(c.key)) {
      problems.push(`content ${c.lang}:${c.key} skipped (unknown language or key shape)`);
      continue;
    }
    counts.content++;
    if (DRY_RUN) continue;
    const value = typeof c.value === 'string' ? c.value : JSON.stringify(c.value);
    await db
      .insert(siteContent)
      .values({ key: c.key, locale: c.lang as Locale, value, updatedBy: c.updated_by ?? ACTOR })
      .onConflictDoNothing();
  }

  console.log(
    [
      `jobs: ${counts.jobsNew} new, ${counts.placeholders} placeholder, ${counts.jobsKept} already there`,
      `applications: ${counts.appsNew} new, ${counts.appsKept} already there`,
      `files: ${counts.files} copied${counts.filesMissing ? `, ${counts.filesMissing} could not be fetched` : ''}`,
      `site content: ${counts.content}`,
    ].join('\n'),
  );
  if (problems.length) console.warn('Notes:\n  ' + problems.join('\n  '));
  console.log(DRY_RUN ? 'Dry run finished — nothing was written.' : 'Done.');
} finally {
  await old.end();
  await db.$client.end();
}
