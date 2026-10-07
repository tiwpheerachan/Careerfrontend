#!/usr/bin/env node
/**
 * The company time-zone standard, checked: OS, app and database all on
 * Asia/Bangkok. Exits 1 if any is not.
 *
 *   npm run check:timezone                 this machine + the dev database (.env.development.local)
 *   npm run check:timezone -- <db-url>     another database
 *   npm run check:timezone -- --skip-os    CI: a runner's OS is not a server's
 *
 *   npm run check:timezone -- --url https://careers.example.com   also a deployed server
 *
 * Also measures clock drift against NIMT (time1.nimt.or.th — Thailand's
 * national time, NTP stratum 1): this machine, the database and, with --url,
 * the deployed app and its database (via GET /api/v1/health → clock). The
 * time zone can be right while a clock is wrong; this records the real drift
 * from a real source rather than the one a machine is assumed to use.
 * Drift over 1 s fails. An unreachable NTP server only warns.
 *
 * Read-only: one `show timezone` and a few clock reads per database.
 */
import dgram from 'node:dgram';
import { existsSync, readFileSync, readlinkSync } from 'node:fs';
import postgres from 'postgres';

const NTP_SERVERS = ['time1.nimt.or.th', 'time2.nimt.or.th', 'time.google.com'];
const MAX_DRIFT_MS = 1000;

const STANDARD = 'Asia/Bangkok';
const args = process.argv.slice(2);
const skipOs = args.includes('--skip-os');
const siteUrl = args[args.indexOf('--url') + 1] && args.includes('--url') ? args[args.indexOf('--url') + 1] : null;

if (
  !args.find((a) => /^postgres(ql)?:\/\//.test(a)) &&
  !process.env.DATABASE_URL &&
  existsSync('.env.development.local')
) {
  process.loadEnvFile('.env.development.local');
}
if (process.env.TZ === undefined && existsSync('.env.development.local')) {
  // The app reads TZ from its env file; check what it will actually run with.
  const { TZ } = Object.fromEntries(
    readFileSync('.env.development.local', 'utf8')
      .split('\n')
      .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  if (TZ) process.env.TZ = TZ;
}
const url = args.find((a) => /^postgres(ql)?:\/\//.test(a)) ?? process.env.DATABASE_URL;

let os = 'unknown';
try {
  os = readlinkSync('/etc/localtime').split('/zoneinfo/').pop();
} catch {
  /* no zone file */
}
const app = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** One SNTP exchange: how far this machine's clock is from the server's (ms; + = we are behind). */
function sntp(host) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const request = Buffer.alloc(48);
    request[0] = 0x1b; // version 3, client
    const sent = Date.now();
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('timeout'));
    }, 4000);
    socket.on('message', (reply) => {
      const received = Date.now();
      clearTimeout(timer);
      socket.close();
      const at = (o) => (reply.readUInt32BE(o) - 2208988800) * 1000 + (reply.readUInt32BE(o + 4) / 2 ** 32) * 1000;
      const [t2, t3] = [at(32), at(40)];
      resolve({ host, offset: (t2 - sent + (t3 - received)) / 2, stratum: reply[1] });
    });
    socket.on('error', (e) => {
      clearTimeout(timer);
      socket.close();
      reject(e);
    });
    socket.send(request, 123, host);
  });
}

let ntp = null;
for (const host of NTP_SERVERS) {
  try {
    ntp = await sntp(host);
    break;
  } catch {
    /* next */
  }
}
/** The reference time now, per NTP (falls back to this clock if NTP is unreachable). */
const trueNow = () => Date.now() + (ntp?.offset ?? 0);

let db = null;
let dbDefault = null;
let dbDrift = null;
if (url) {
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10, onnotice: () => {} });
  try {
    const [row] = await sql`select current_setting('TimeZone') as tz,
      (select array_to_string(setconfig, ',') from pg_db_role_setting s join pg_database d on d.oid = s.setdatabase
        where d.datname = current_database() and s.setrole = 0) as db_settings`;
    db = row.tz;
    dbDefault = /timezone=([^,]+)/i.exec(row.db_settings ?? '')?.[1] ?? null;
    // Best of five: the read with the shortest round trip is the most exact.
    for (let i = 0; i < 5; i++) {
      const before = trueNow();
      const [r] = await sql`select (extract(epoch from clock_timestamp()) * 1000)::float8 as ms`;
      const after = trueNow();
      const sample = { drift: r.ms - (before + after) / 2, margin: (after - before) / 2 };
      if (!dbDrift || sample.margin < dbDrift.margin) dbDrift = sample;
    }
  } finally {
    await sql.end();
  }
}

let site = null;
if (siteUrl) {
  const before = trueNow();
  const response = await fetch(new URL('/api/v1/health', siteUrl));
  const after = trueNow();
  const body = await response.json();
  const mid = (before + after) / 2;
  site = {
    zones: body.timeZones,
    app: body.clock?.app ? Date.parse(body.clock.app) - mid : null,
    db: body.clock?.db ? Date.parse(body.clock.db.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')) - mid : null,
    margin: (after - before) / 2,
  };
}

const rows = [
  ['OS (this machine)', os, skipOs],
  ['App (Node TZ)', app, false],
  ['DB session TimeZone', db ?? '(no database url)', false],
  ['DB default (migration 0004)', dbDefault ?? '(not set)', false],
];
if (site) {
  rows.push(
    ['Site OS', site.zones?.os ?? '?', false],
    ['Site app', site.zones?.app ?? '?', false],
    ['Site DB', site.zones?.db ?? '?', false],
  );
}
let failed = false;
console.log(`Time zones (standard ${STANDARD})`);
for (const [label, value, skipped] of rows) {
  const ok = value === STANDARD;
  if (!ok && !skipped) failed = true;
  console.log(`${skipped ? '–' : ok ? '✓' : '✖'} ${label.padEnd(28)} ${value}${skipped ? '  (skipped)' : ''}`);
}

const fmt = (ms) => `${ms >= 0 ? '+' : ''}${Math.round(ms)} ms`;
console.log(`\nClock drift vs ${ntp ? `${ntp.host} (NTP stratum ${ntp.stratum})` : 'NTP — unreachable, not measured'}`);
const drifts = [];
if (ntp) {
  let source = 'unknown';
  try {
    source = /^server\s+(\S+)/m.exec(readFileSync('/etc/ntp.conf', 'utf8'))?.[1] ?? 'unknown';
  } catch {
    /* not macOS / no ntp.conf */
  }
  drifts.push(['this machine', -ntp.offset, 0, `syncs from ${source}`]);
  if (dbDrift) drifts.push(['database', dbDrift.drift, dbDrift.margin, 'database server clock']);
  if (site?.app != null) drifts.push(['site app', site.app, site.margin, 'via /api/v1/health']);
  if (site?.db != null) drifts.push(['site database', site.db, site.margin, 'via /api/v1/health']);
}
for (const [label, drift, margin, note] of drifts) {
  const ok = Math.abs(drift) - margin <= MAX_DRIFT_MS;
  if (!ok) failed = true;
  console.log(
    `${ok ? '✓' : '✖'} ${label.padEnd(28)} ${fmt(drift)}${margin ? ` (±${Math.round(margin)} ms)` : ''}  ${note}`,
  );
}

console.log(
  failed ? `\n✖ not on the standard` : `\n✓ on the standard: ${STANDARD}, clocks within ${MAX_DRIFT_MS} ms of NTP`,
);
process.exit(failed ? 1 : 0);
