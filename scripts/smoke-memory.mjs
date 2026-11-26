#!/usr/bin/env node
/**
 * The built app under load inside the size of the Render instance (512 MB, 0.5 CPU, no swap), in Docker.
 *
 *   TEST_DATABASE_URL=postgres://…@127.0.0.1:55435/shd_career_test node scripts/smoke-memory.mjs
 *   … node scripts/smoke-memory.mjs npm run start      another start command than Render's
 *
 * Needs Docker, a migrated local database (`npm test` migrates the test one) and a build made on Linux: on
 * macOS run `npm ci && npm run build` in a node:24 container first (next.config.ts needs the Linux SWC).
 * The uploads go to a job made for the run and removed after it, and lack most fields: the whole body is read
 * and refused, nothing is stored. Turnstile is answered inside the container (no call to Cloudflare).
 *
 * Fails when:
 *   - the kernel killed anything for memory, or the server died;
 *   - `anon` of the container (the memory that cannot be given back; page cache is not counted) passed
 *     MAX_ANON_MB, sampled every 0.3 s. 420 leaves ~90 MB of the 512 for what this load does not do;
 *   - a page or a picture did not answer 200, /_next/image anything but 404 (it would be resizing while
 *     serving), or an upload was not read and refused for its fields (or, two of 60 MB, 503: over the budget);
 *   - after SIGTERM an upload already on its way is cut off, or the exit code is not 0 or 143.
 */
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import postgres from 'postgres';
import { describeTarget } from './db-target.mjs';

const MAX_ANON_MB = 420;
const PORT = process.env.SMOKE_PORT ?? '10123';
const NAME = process.env.SMOKE_NAME ?? 'shd-career-smoke';
const IMAGE = 'node:24-bookworm-slim';
const BASE = `http://127.0.0.1:${PORT}`;
const MB = 1024 * 1024;
const JOB = 'SMOKE-MEMORY';
// startCommand in render.yaml.
const START =
  process.argv.length > 2 ? process.argv.slice(2) : 'node node_modules/next/dist/bin/next start -H 0.0.0.0'.split(' ');

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is not set.');
if (!describeTarget(databaseUrl).local) throw new Error('TEST_DATABASE_URL is not a local database.');
if (!existsSync('.next/BUILD_ID')) throw new Error('No build here: run `npm run build` first, from the project root.');

const failures = [];
const fail = (message) => {
  failures.push(message);
  console.error(`✖ ${message}`);
};
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/* ---- an open job to send the uploads to --------------------------------- */

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });
const removeJob = () => sql`delete from jobs where code = ${JOB}`;
await removeJob();
await sql`with job as (
    insert into jobs (code, publish_state, country_code, published_at) values (${JOB}, 'PUBLISHED', 'TH', now())
    returning pk)
  insert into job_translations (jobs_pk, locale, title) select pk, 'th', 'Smoke' from job`;

/* ---- the container ------------------------------------------------------ */

const inContainer = new URL(databaseUrl);
inContainer.hostname = 'host.docker.internal';
const secret = randomBytes(24).toString('hex');
const env = {
  PORT: '10000',
  TZ: 'Asia/Bangkok',
  NODE_ENV: 'production',
  LOG_LEVEL: 'info',
  DATABASE_URL: inContainer.href,
  STORAGE_DRIVER: 'supabase',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:2',
  SUPABASE_SERVICE_ROLE_KEY: secret,
  SESSION_SECRET: secret,
  // Cloudflare's published always-pass test keys.
  TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
  // Turnstile says yes without the network: checked before the body is read, it would decide the result.
  NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(
    "const f = globalThis.fetch; globalThis.fetch = (u, o) => String(u).startsWith('https://challenges.cloudflare.com/') ? Promise.resolve(Response.json({ success: true })) : f(u, o);",
  )}`,
};
// A developer's env files must not reach this server: hidden, not read.
const hidden = ['.env', '.env.local', '.env.production', '.env.production.local'].filter((f) => existsSync(f));

// Pulled before the clock starts; a missing image is a plain error.
try {
  docker('image', 'inspect', IMAGE);
} catch {
  docker('pull', '-q', IMAGE);
}
try {
  docker('rm', '-f', '-v', NAME);
} catch {
  /* none left over */
}
docker(
  ...['run', '-d', '--name', NAME, '--cpus', '0.5', '--memory', '512m', '--memory-swap', '512m'],
  ...['--add-host', 'host.docker.internal:host-gateway', '-p', `127.0.0.1:${PORT}:10000`],
  // An empty .next/cache, whatever the last build or run left there.
  ...['-v', `${process.cwd()}:/app`, '-v', '/app/.next/cache', '-w', '/app'],
  ...hidden.flatMap((f) => ['-v', `/dev/null:/app/${f}:ro`]),
  ...Object.entries(env).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
  ...[IMAGE, ...START],
);

const state = () => {
  const [running, oom, code] = docker(
    'inspect',
    '-f',
    '{{.State.Running}} {{.State.OOMKilled}} {{.State.ExitCode}}',
    NAME,
  ).split(' ');
  return { running: running === 'true', oom: oom === 'true', code: Number(code) };
};

let peak = 0;
let oomKills = 0;
let samples = 0;
function startSampling() {
  const script =
    "while :; do awk '/^anon /{a=$2} /^oom_kill /{o=$2} END{print a, o}' /sys/fs/cgroup/memory.stat /sys/fs/cgroup/memory.events; sleep 0.3; done";
  const child = spawn('docker', ['exec', NAME, 'sh', '-c', script], { stdio: ['ignore', 'pipe', 'ignore'] });
  let rest = '';
  child.stdout.on('data', (chunk) => {
    const lines = (rest + chunk).split('\n');
    rest = lines.pop();
    for (const line of lines) {
      const [anon, kills] = line.split(' ').map(Number);
      peak = Math.max(peak, anon / MB);
      oomKills = Math.max(oomKills, kills);
      samples++;
    }
  });
  child.on('error', () => {});
  return child;
}

/* ---- the load ----------------------------------------------------------- */

/** The status, or the reason there is none. */
async function status(path, init) {
  try {
    const response = await fetch(BASE + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(120_000),
      ...init,
      // Not kept alive: a slow server closes an idle connection just as the next request takes it.
      headers: { ...init?.headers, connection: 'close' },
    });
    const text = await response.text();
    // Every refusal of a half-empty application names its missing fields, and only after the body was read.
    return response.status === 400 && text.includes('lastName') ? 'read' : response.status;
  } catch (error) {
    return error.cause?.code ?? error.name;
  }
}

/** `jobs` run `width` at a time, then the count of each answer, checked against what is allowed. */
async function run(label, jobs, width, allowed) {
  const started = performance.now();
  const seen = {};
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: width }, async () => {
      for (let job; (job = queue.shift());) {
        const answer = await job();
        seen[answer] = (seen[answer] ?? 0) + 1;
        // A dead server answers nothing: the rest would only be timeouts.
        if (typeof answer === 'string' && answer !== 'read' && !state().running) queue.length = 0;
      }
    }),
  );
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`  ${label}: ${JSON.stringify(seen)} in ${seconds} s, peak so far ${Math.round(peak)} MB`);
  const wrong = Object.keys(seen).filter((answer) => !allowed.includes(answer));
  if (wrong.length) fail(`${label}: answered ${wrong.join(', ')}, expected ${allowed.join(' or ')}`);
}

const pdf = (mb) =>
  new Blob([Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(mb * MB - 9, 1)])], { type: 'application/pdf' });
const UPLOAD = `/api/v1/jobs/${JOB}/applications`;
const TOKEN = { 'x-turnstile-token': 'smoke' };
const five = pdf(5);
const ten = pdf(10);
const upload = (big) => () => {
  const form = new FormData();
  form.append('firstName', 'smoke');
  form.append('resume', five, 'a.pdf');
  if (big) {
    form.append('transcript', five, 'b.pdf');
    for (let i = 0; i < 5; i++) form.append('attachments', ten, `${i}.pdf`);
  }
  return status(UPLOAD, { method: 'POST', body: form, headers: TOKEN });
};

const files = (dir) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true })
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
        .sort()
    : [];
const pictures = files('public/_img').map((f) => `/_img/${f.split('/').map(encodeURIComponent).join('/')}`);
const optimizer = files('public')
  .filter((f) => !f.startsWith('_img'))
  .slice(0, 20)
  .flatMap((f) => [640, 1080, 1920].map((w) => `/_next/image?url=${encodeURIComponent(`/${f}`)}&w=${w}&q=75`));
const pages = ['th', 'en', 'zh'].flatMap((l) =>
  ['', '/about', '/why-shd', '/jobs', '/partners', '/application-form'].map((p) => `/${l}${p}`),
);
const gets = (paths) => paths.map((path) => () => status(path, { headers: { accept: 'image/webp,text/html' } }));

/** An upload half sent when SIGTERM comes: it must still be answered. */
function slowUpload() {
  const body = Buffer.concat([
    Buffer.from('--x\r\nContent-Disposition: form-data; name="resume"; filename="a.pdf"\r\n\r\n%PDF-1.4\n'),
    Buffer.alloc(2 * MB, 1),
    Buffer.from('\r\n--x--\r\n'),
  ]);
  const half = body.length / 2;
  let finish;
  const answered = new Promise((resolve) => {
    const request = http.request(
      BASE + UPLOAD,
      {
        method: 'POST',
        agent: false,
        headers: { ...TOKEN, 'content-type': 'multipart/form-data; boundary=x', 'content-length': body.length },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on('error', (error) => resolve(error.code));
    request.setTimeout(30_000, () => request.destroy(Object.assign(new Error('timeout'), { code: 'timeout' })));
    request.write(body.subarray(0, half));
    finish = () => request.end(body.subarray(half));
  });
  return { answered, finish: () => finish() };
}

/* ---- the run ------------------------------------------------------------ */

let sampler;
try {
  sampler = startSampling();
  let up = false;
  for (let i = 0; i < 90 && !up && state().running; i++) {
    up = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then(
        (body) => body.status === 'ok',
        () => false,
      );
    if (!up) await sleep(1000);
  }
  if (!up) {
    throw new Error('The server did not come up with its database (/api/v1/health).');
  }
  console.log(`up, ${Math.round(peak)} MB`);

  if (pictures.length === 0) fail('no pictures in public/_img: npm run build did not make them');
  const mixed = Array.from({ length: 40 }, (_, i) => pages[i % pages.length]);
  await Promise.all([
    run('pictures', gets(pictures), 6, ['200']),
    run('pages', gets(mixed), 3, ['200']),
    run('uploads 4 x 5 MB', Array(4).fill(upload(false)), 4, ['read']),
  ]);
  if (state().running) await run('/_next/image', gets(optimizer), 6, ['404']);
  // The refused one may lose its connection while it is still sending (the 503 does not wait for the body).
  if (state().running)
    await run('uploads 2 x 60 MB', Array(2).fill(upload(true)), 2, [
      'read',
      '503',
      'EPIPE',
      'ECONNRESET',
      'UND_ERR_SOCKET',
    ]);

  if (state().running) {
    await sleep(1000);
    if ((await status('/api/v1/health')) !== 200) fail('health is not 200 after the load');
    const slow = slowUpload();
    await sleep(1500);
    const started = performance.now();
    docker('kill', '--signal', 'TERM', NAME);
    await sleep(1500);
    slow.finish();
    const answer = await slow.answered;
    if (answer !== 400) fail(`an upload on its way when SIGTERM came got ${answer}, expected 400`);
    for (let i = 0; i < 30 && state().running; i++) await sleep(1000);
    const { running, code } = state();
    if (running) fail('still running 30 s after SIGTERM');
    else if (code !== 0 && code !== 143) fail(`exit code ${code} after SIGTERM, expected 0 or 143`);
    console.log(
      `  SIGTERM: upload ${answer}, exit code ${code}, ${((performance.now() - started) / 1000).toFixed(1)} s`,
    );
  } else {
    fail(`the server died under load (exit code ${state().code})`);
  }
  if (state().oom || oomKills > 0) fail('the kernel killed a process for memory');
  if (samples < 10) fail(`only ${samples} memory samples: the peak below means nothing`);
  if (peak > MAX_ANON_MB) fail(`peak anon ${Math.round(peak)} MB is over ${MAX_ANON_MB} MB`);
  console.log(`peak anon ${Math.round(peak)} MB of 512 (limit ${MAX_ANON_MB}), ${samples} samples`);
} catch (error) {
  fail(error.message);
} finally {
  sampler?.kill();
  if (failures.length) console.error(docker('logs', '--tail', '40', NAME));
  docker('rm', '-f', '-v', NAME);
  await removeJob();
  await sql.end();
}
console.log(failures.length ? `✖ ${failures.length} failed` : '✓ memory smoke passed');
process.exit(failures.length ? 1 : 0);
