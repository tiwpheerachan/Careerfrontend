import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { handler, json } from '@/lib/api/http';
import { isoWithOffset } from '@/lib/time';
import { timeZones } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

/** A database that does not answer is as unreachable as one that refuses: Render would restart us for waiting. */
const TIMEOUT_MS = 3000;

/** One probe at a time: while the database hangs, every poll would take another connection. */
let probe: Promise<unknown> | undefined;
async function query() {
  probe ??= Promise.resolve(
    db().execute(sql`select current_setting('TimeZone') as time_zone, clock_timestamp()::text as db_clock`),
  ).finally(() => (probe = undefined));
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${TIMEOUT_MS} ms`)), TIMEOUT_MS);
  });
  return Promise.race([probe, late]).finally(() => clearTimeout(timer));
}

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
    const rows = (await query()) as Array<{
      time_zone: string;
      db_clock: string;
    }>;
    return json({
      // No database name or Postgres version: this is public, and they only help an attacker.
      status: 'ok',
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
