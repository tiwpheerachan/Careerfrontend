import { defineConfig } from 'drizzle-kit';
import { assertMayTouch } from './scripts/db-target.mjs';

/**
 * DIRECT_URL, never DATABASE_URL.
 *
 * Migrations run DDL and take advisory locks, and neither works through
 * Supabase's transaction pooler on 6543. DIRECT_URL is the session pooler on
 * 5432 and is the only connection that may run a migration.
 *
 * Migrations are SQL written by hand in drizzle/NNNN_name.sql plus an entry in
 * drizzle/meta/_journal.json (`npm run db:generate:custom` makes the empty
 * file and the entry). `drizzle-kit push` is never used.
 */
const url = process.env.DIRECT_URL;
if (!url) {
  throw new Error(
    'DIRECT_URL is not set. Migrations need the session-mode connection (port 5432); ' +
      'DDL and advisory locks do not work through the transaction pooler on 6543.',
  );
}

// A non-local database is production, reached only through npm run
// db:prod:migrate or the deploy host (scripts/db.mjs).
assertMayTouch(url, 'drizzle-kit');

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
