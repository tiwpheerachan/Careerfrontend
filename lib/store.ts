import { db } from '@/lib/db/client';
import { createRepositories, type Repositories } from '@/lib/repositories';

/**
 * The application's storage handle: the repositories over Supabase Postgres.
 *
 * Cached on globalThis rather than a module-level `let` so a hot reload, which
 * replaces the module, does not build a second set on every save.
 */
const CACHE = Symbol.for('shd-careers.store');

interface Cache {
  [CACHE]?: Repositories;
}

export function store(): Repositories {
  const globals = globalThis as Cache;
  globals[CACHE] ??= createRepositories(db());
  return globals[CACHE];
}
