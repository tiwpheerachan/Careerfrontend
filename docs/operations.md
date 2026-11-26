# Operations (production)

One Render web service (512 MB, 0.5 CPU, one instance, branch `release`) + Supabase (Postgres and Storage), behind
Cloudflare at `https://careers.shd-technology.co.th`. The settings live in the Render dashboard;
[render.yaml](../render.yaml) documents them. "To fill in" below = not known when this was written.

## ดู log ที่ไหน (logs)

- Render dashboard → the service → **Logs** (app lines, kept 7 days) and **Events** (deploys, restarts, failures).
  There are no request logs. Sentry is off.
- App lines are JSON (pino). An API error: take `x-request-id` from the response, search the logs for it.
- Who did what in the admin: table `admin_audit_logs` ([setup.md](setup.md), Audit trail).
- Database: Supabase dashboard → Logs. Retention: to fill in.

## หน่วยความจำเต็ม (out of memory)

**Signature:** 502s for everybody for a moment; a failure/restart in Render **Events** that mentions memory; in the
logs `server starting` again with no deploy, and no error line before it (the kernel's kill writes nothing).

| Log line        | What it says                                                                                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memory limits` | Once per start. `heapLimitMb`: the most V8 lets our objects take. `constrainedMb`: the limit the container reports (512 expected).                                                                                                                                                                                     |
| `memory`        | Every 5 s, but only if the process changed by 32 MB or more since the last line. `rssMb` all of it, `heapMb` our objects, `externalMb` Buffers (uploads, files); the rest of rss is native (fonts, libraries, allocator). `inFlight`: the API requests being answered then. No line is not proof that memory was fine. |
| `memory high`   | A warning over 400 MB, at most once a minute, with the same fields.                                                                                                                                                                                                                                                    |
| `request start` | Written before a heavy or changing API request. One without its `request` line before a restart is the suspect.                                                                                                                                                                                                        |

CI runs the built app in the same 512 MB / 0.5 CPU (`scripts/smoke-memory.mjs`; thresholds in its header). If it fails,
find what grew before raising a threshold.

## ก่อนและหลัง deploy

Render starts the server with node itself (`startCommand`). `npm run start` uses `exec` so that SIGTERM reaches the
server and uploads on their way are finished; `exec` needs a Unix shell: on Windows use WSL, or the `startCommand`.

Before: merge to `release` only when CI is green on it. Recommended settings (owner to switch on; not set now):

- GitHub branch protection on `release` and `main`: pull request + the status check `check`, no force push.
- Render → Settings → Auto-Deploy: **After CI checks pass** (now: every commit). CI runs on pushes to `release`.

After:

1. Render **Events**: the deploy is live; the pre-deploy (migration) log has no error.
2. `https://careers.shd-technology.co.th/api/v1/health` → `"status":"ok"` and `timeZones.ok` true.
3. `/th`, `/th/jobs`, one job and its application form; pictures show; `/admin` signs in.
4. Logs: `memory limits`, no level 50/60 lines; `memory` stays steady over the next 30 minutes.
5. First deploy after the health check got its database timeout: set Render's Health Check Path to `/api/v1/health`.

## ย้อนเวอร์ชัน (rollback)

Render → **Events** → an earlier deploy → **Rollback**. Then check whether Auto-Deploy is still on, and revert the
commit on `release` too, or the next deploy brings it back.

**A rollback does not revert migrations.** The old code runs on the new schema, which only works if the migration was
an expand step (below). Undoing one is a new, forward migration.

## Migrations: expand, then contract

`npm run db:migrate:deploy` runs before the new version takes traffic, so the old version runs on the new schema for a
while. Each change in two releases:

1. **Expand** — only add: nullable columns (or with a constant default), new tables, new enum values. Deploy code that
   works with both.
2. **Contract** — a release later, when a rollback to the older code is no longer wanted: drop, rename, `NOT NULL`.

Start every migration that touches an existing table with `SET LOCAL lock_timeout = '5s';` (and
`SET LOCAL statement_timeout` for a long one). Without it, an `ALTER TABLE` waiting for a lock queues every query behind
it; with it, the deploy fails and the old version keeps serving: run it again at a quiet time.
All pending migrations run in one transaction, so `CREATE INDEX CONCURRENTLY` cannot go in one.

## Uptime monitor

Any external monitor, every 1–5 minutes: `GET https://careers.shd-technology.co.th/api/v1/health`, alert when the
keyword `"status":"ok"` is missing. Check the keyword, not only the code: the endpoint may answer 200 while the database
is unreachable. Service used, and who is alerted: to fill in.

## Backup และการกู้คืน (restore)

- Supabase's database backups do **not** contain Storage objects: the rows come back, the résumés in the bucket
  `applications` do not. The files need a copy of their own.
- Database backup plan and retention: to fill in. Storage copy — where, how often: to fill in.
- **Drill** (every 6 months; last done: to fill in). Never into production:
  1. Restore the latest database backup into a new Supabase project.
  2. `select max(created_at) from applications;` — how much would have been lost.
  3. Copy the Storage backup into a private bucket `applications` there; open 5 files that the restored rows name.
  4. Start the app locally against it, read-only use, and note how long the whole drill took.
  5. Delete the project: it holds applicants' personal data.

## เปลี่ยน secret (rotation)

`backend/.env` and `frontend/.env` of the old app were committed and are still in git history (untracked since
`667d42be`): treat every secret in them as known. Names only, never paste values here.

- [ ] `SUPABASE_SERVICE_ROLE_KEY` (the old project's; check it is not the one in use)
- [ ] `APPLY_SHEET_API_KEY` and the Apps Script url (`APPS_SCRIPT_APPLY_SHEET_URL`; now `APPLY_SHEET_WEBHOOK_URL`)
- [ ] `SMTP_USER` / `SMTP_PASS`
- [ ] `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET` (the old admin: gone; make sure they are not reused anywhere)

Current secrets, after a leak or when someone with access leaves — change at the source, then in Render → Environment
(which redeploys):

- [ ] Supabase: database password (`DATABASE_URL`, `DIRECT_URL`), `SUPABASE_SERVICE_ROLE_KEY`
- [ ] SSO console: `SSO_CLIENT_SECRET`, `CENTRAL_API_KEY`
- [ ] `SESSION_SECRET` (`openssl rand -base64 48`; signs every admin out)
- [ ] Cloudflare: `TURNSTILE_SECRET_KEY`
- [ ] Apps Script: `APPLY_SHEET_API_KEY`

Last rotated, and by whom: to fill in.
