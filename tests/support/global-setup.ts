import { rmSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { testDatabaseUrl } from './db';

/**
 * Applies the committed SQL migrations to the test database once per run —
 * the same migrator and the same drizzle/ folder production uses, so the
 * tests exercise the migrations that ship. Re-running is a no-op.
 */
export default async function setup() {
  // Files uploaded by the previous run's API tests (STORAGE_DRIVER=local).
  if (process.env.LOCAL_STORAGE_DIR) rmSync(process.env.LOCAL_STORAGE_DIR, { recursive: true, force: true });

  const client = postgres(testDatabaseUrl(), { max: 1, prepare: false, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  } finally {
    await client.end();
  }
}
