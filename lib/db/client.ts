import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { describeTarget } from '@/scripts/db-target.mjs';

export type Database = ReturnType<typeof createDatabase>;

/**
 * A Drizzle client over postgres.js.
 *
 * prepare:false is not optional. Supabase's transaction pooler on 6543 hands a
 * different backend connection to each transaction, so a prepared statement
 * created on one is missing on the next — intermittent "prepared statement
 * already exists" errors that depend on pooler scheduling.
 */
export function createDatabase(url: string, options: { max?: number } = {}) {
  const client = postgres(url, {
    prepare: false,
    max: options.max ?? 10,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

const CACHE = Symbol.for('shd-careers.db');
interface Cache {
  [CACHE]?: Database;
}

/**
 * The application-wide client, connected as the database owner (RLS is on
 * with no policies, so only the owner reads anything).
 *
 * Cached on globalThis so a hot reload does not open a second pool per save.
 *
 * In development a non-local database is refused unless SHD_ALLOW_PRODUCTION=1:
 * `next dev` falls back to .env.local — production — whenever
 * .env.development.local is missing, and a dev server writes like any other.
 */
export function db(): Database {
  const globals = globalThis as Cache;
  if (globals[CACHE]) return globals[CACHE];

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  if (process.env.NODE_ENV === 'development') {
    const target = describeTarget(url);
    if (!target.local && process.env.SHD_ALLOW_PRODUCTION !== '1') {
      throw new Error(
        `npm run dev is pointed at ${target.host}, which is not a local database — that is production. ` +
          'Create .env.development.local from .env.development.example and start the dev database (npm run db:dev:up). ' +
          'To really run a dev server against production, set SHD_ALLOW_PRODUCTION=1.',
      );
    }
  }
  globals[CACHE] = createDatabase(url);
  return globals[CACHE];
}
