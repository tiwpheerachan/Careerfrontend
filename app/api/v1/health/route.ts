import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { handler, json } from '@/lib/api/http';
import { isoWithOffset } from '@/lib/time';
import { timeZones } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/health — is the database actually reachable.
 *
 * Runs a real query rather than reporting configuration: "DATABASE_URL is set"
 * is not the same claim as "Postgres answers".
 *
 * Also reports the time zones of the OS, the app and the database session,
 * against the company standard (Asia/Bangkok) — see lib/timezone.ts.
 *
 * Never returns 500. An unreachable database is a normal answer here, reported
 * in the body with a 200: Render polls this to decide a deploy came up, and
 * restarting the web service does not fix Supabase — cycling the instance
 * during a database blip would turn a degraded site into no site.
 */
export const GET = handler(async (_request, { log }) => {
  const started = performance.now();
  try {
    const rows = (await db().execute(
      sql`select current_database() as database, version() as version, current_setting('TimeZone') as time_zone,
             clock_timestamp()::text as db_clock`,
    )) as unknown as Array<{
      database: string;
      version: string;
      time_zone: string;
      db_clock: string;
    }>;
    return json({
      status: 'ok',
      database: rows[0]?.database ?? 'unknown',
      // "PostgreSQL 17.6 on aarch64…" — the first two words are the useful part.
      version: rows[0]?.version.split(' ').slice(0, 2).join(' ') ?? 'unknown',
      latencyMs: Math.round(performance.now() - started),
      // The company standard's three zones — the 90-day verification reads this.
      timeZones: timeZones(rows[0]?.time_zone ?? null),
      // Both clocks, with offsets — compare against an NTP reference to measure drift
      // (npm run check:timezone -- --url https://…).
      clock: { app: isoWithOffset(), db: rows[0]?.db_clock ?? null },
    });
  } catch (err) {
    log.warn({ err }, 'health: database unreachable');
    return json({
      status: 'unreachable',
      latencyMs: Math.round(performance.now() - started),
      timeZones: timeZones(null),
    });
  }
});
