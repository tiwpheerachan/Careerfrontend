import { readlinkSync } from 'node:fs';
import { STANDARD_TIME_ZONE } from '@/lib/env';

/**
 * The three time zones the company standard asks about, as this server sees
 * them. All three must be Asia/Bangkok:
 *
 *   os    the machine's zone file (/etc/localtime)
 *   app   what this Node process formats local times in (the TZ variable)
 *   db    the database session's TimeZone (set per database by migration 0004)
 *
 * Shown by GET /api/v1/health and checked by `npm run check:timezone`, so the
 * 90-day verification is one url or one command.
 *
 * Whatever the zones, timestamps are STORED as instants (timestamptz) and the
 * API sends them in ISO UTC (…Z); the zones only decide how a time is written
 * out as local text and which calendar day "today" is.
 */
export interface TimeZones {
  os: string;
  app: string;
  db: string | null;
  standard: string;
  ok: boolean;
}

/** /etc/localtime → "Asia/Bangkok"; "unknown" where there is no zone file (some containers). */
export function osTimeZone(): string {
  try {
    const target = readlinkSync('/etc/localtime');
    return target.split('/zoneinfo/').pop() ?? target;
  } catch {
    return 'unknown';
  }
}

export function appTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function timeZones(db: string | null): TimeZones {
  const os = osTimeZone();
  const app = appTimeZone();
  return {
    os,
    app,
    db,
    standard: STANDARD_TIME_ZONE,
    // All three, as the standard asks. A host whose zone file cannot be set
    // shows up here as not ok rather than being quietly excused.
    ok: os === STANDARD_TIME_ZONE && app === STANDARD_TIME_ZONE && db === STANDARD_TIME_ZONE,
  };
}
