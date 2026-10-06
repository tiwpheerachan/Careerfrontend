import { db } from '@/lib/db/client';
import { createRepositories, type Repositories } from '@/lib/repositories';

/**
 * The application's storage handle: the repositories over Supabase Postgres.
 *
 * The connection pool is cached on globalThis by db() so a hot reload does not
 * open a second pool on every save. The repositories themselves are only
 * cached in production: they are plain objects over that pool, cheap to
 * build, and a cached set in development keeps running the code from before
 * the last edit (a new sort option silently ignored until a restart).
 */
const CACHE = Symbol.for('shd-careers.store');

interface Cache {
  [CACHE]?: Repositories;
}

export function store(): Repositories {
  if (process.env.NODE_ENV !== 'production') return createRepositories(db());
  const globals = globalThis as Cache;
  globals[CACHE] ??= createRepositories(db());
  return globals[CACHE];
}
