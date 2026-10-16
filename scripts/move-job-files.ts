/**
 * Move the job applications' files from the bucket's top level into jobs/.
 *
 *   npm run db:dev:move-job-files  [-- --dry-run]
 *   npm run db:prod:move-job-files [-- --dry-run]     (asks you to type "production")
 *
 * Before 2026-10-16 an application's files went to `<uuid>/resume-0.pdf`, next
 * to the application forms' `forms/` and the import's `legacy/`. New ones go to
 * `jobs/<uuid>/…` (lib/api/apply.ts); this moves the old ones to match.
 *
 * One file at a time: the object is moved in storage (no download), then its
 * row's storage_path — and moved back if the row cannot be updated. Safe to run
 * again: rows already under a folder are not picked up, and a file moved by a
 * run that stopped before its row was updated is found at its new path.
 * While it runs, a file can 404 for the moment between the two steps: run it
 * when few people are applying.
 */
import { and, eq, sql } from 'drizzle-orm';
import { assertMayTouch, targetLabel } from './db-target.mjs';
import { createDatabase } from '@/lib/db/client';
import { applicationFiles } from '@/lib/db/schema';
import { NotFoundError } from '@/lib/errors';
import type { ObjectStore } from '@/lib/storage';
import { createLocalStore } from '@/lib/storage/local';
import { createSupabaseStore } from '@/lib/storage/supabase';

const DRY_RUN = process.argv.includes('--dry-run');

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set.');
const target = assertMayTouch(url, 'move-job-files');

function storageOf(): ObjectStore {
  if ((process.env.STORAGE_DRIVER || 'local') === 'supabase') {
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!origin || !key)
      throw new Error('STORAGE_DRIVER=supabase needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    return createSupabaseStore({ origin, key, bucket: process.env.STORAGE_BUCKET || 'applications' });
  }
  return createLocalStore(process.env.LOCAL_STORAGE_DIR || '.storage');
}

/** `<uuid>/<name>`: a file at the top level, as lib/api/apply.ts wrote them before jobs/. */
const TOP_LEVEL = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$';

const db = createDatabase(url);
const objects = storageOf();
const rows = await db
  .select({ id: applicationFiles.id, path: applicationFiles.storagePath })
  .from(applicationFiles)
  .where(sql`${applicationFiles.storagePath} ~ ${TOP_LEVEL}`)
  .orderBy(applicationFiles.pk);

console.log(
  `${rows.length} file(s) at the top level → jobs/  (${targetLabel(target)}, storage: ${process.env.STORAGE_DRIVER || 'local'})` +
    (DRY_RUN ? '  — dry run, nothing changes' : ''),
);

let moved = 0;
let missing = 0;
let failed = 0;
for (const row of rows) {
  const to = `jobs/${row.path}`;
  if (DRY_RUN) {
    console.log(`  ${row.path} → ${to}`);
    continue;
  }
  try {
    const already = await objects.move(row.path, to).then(
      () => false,
      async (error: unknown) => {
        if (!(error instanceof NotFoundError)) throw error;
        // Not at the old path: moved by a run that stopped before its row — or gone altogether.
        return objects.read(to).then(
          () => true,
          () => null,
        );
      },
    );
    if (already === null) {
      missing++;
      console.warn(`  ! ${row.path}: not in storage at either path — row left as it is`);
      continue;
    }
    try {
      await db
        .update(applicationFiles)
        .set({ storagePath: to })
        .where(and(eq(applicationFiles.id, row.id), eq(applicationFiles.storagePath, row.path)));
    } catch (error) {
      if (!already) await objects.move(to, row.path).catch(() => {});
      throw error;
    }
    moved++;
  } catch (error) {
    failed++;
    console.error(`  ✖ ${row.path}: ${error instanceof Error ? error.message : error}`);
  }
}

if (!DRY_RUN) console.log(`moved ${moved}, missing ${missing}, failed ${failed}`);
await db.$client.end();
process.exit(failed ? 1 : 0);
