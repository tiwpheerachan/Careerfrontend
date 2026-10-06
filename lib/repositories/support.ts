import { sql } from 'drizzle-orm';
import type { Locale } from '@/lib/db/schema';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a public id is even shaped like one. Checked before querying so a
 * malformed id is a 404, not a Postgres "invalid input syntax for type uuid"
 * 500 (which the old admin returned for a bad application id).
 */
export const isUuid = (value: string) => UUID.test(value);

/** The order a missing translation falls back through: the asked language, then English, Thai, Chinese. */
export function localeFallback(locale: Locale): Locale[] {
  return [locale, ...(['en', 'th', 'zh'] as const).filter((l) => l !== locale)];
}

/** The first translation present, in fallback order. */
export function pickTranslation<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
  for (const candidate of localeFallback(locale)) {
    const row = rows.find((r) => r.locale === candidate);
    if (row) return row;
  }
  return undefined;
}

/** `%term%` for ILIKE, with the user's own % and _ taken literally. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export interface Page {
  page: number;
  pageSize: number;
}

export const offsetOf = ({ page, pageSize }: Page) => (page - 1) * pageSize;

/**
 * `"jobs"."pk"`, written out in full — for correlated subqueries.
 *
 * Drizzle renders `${jobs.pk}` as a bare `"pk"` when the outer query reads from
 * `jobs` alone, and inside `select … from job_translations t where t.jobs_pk = "pk"`
 * Postgres resolves that bare name to the SUBQUERY's own pk. The query still
 * runs and returns another job's row — a wrong title, a missed search hit.
 */
export const JOBS_PK = sql`${sql.identifier('jobs')}.${sql.identifier('pk')}`;
