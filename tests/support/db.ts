import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { describeTarget } from '@/scripts/db-target.mjs';

/**
 * The test database connection: a local postgres:17 container, never Supabase.
 * The suite truncates between every test.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set. Start the test database with `npm run db:test:up`.');
  if (/supabase\.(co|com)/i.test(url) || !describeTarget(url).local) {
    throw new Error('TEST_DATABASE_URL is not a local database. The test suite truncates; refusing to run.');
  }
  return url;
}

const client = postgres(testDatabaseUrl(), { max: 4, prepare: false, onnotice: () => {} });

export const testDb = drizzle(client, { schema });
export const testClient = client;

/**
 * Per-test isolation by truncation. Every table goes in this list as it is
 * created — a table left out leaks rows from one test into the next.
 */
export async function resetDatabase(): Promise<void> {
  await testDb.execute(sql`
    truncate table rate_limits,
                   jobs, job_translations,
                   applications, application_educations, application_experiences, application_skills,
                   application_files, application_notes, application_stage_changes,
                   site_content, application_forms
    restart identity cascade
  `);
}
