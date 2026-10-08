# SHD Careers — local setup

Next.js 16 (App Router) + Drizzle + Postgres 17. One app for the public site, the admin and the API.
It replaced an older Vite + FastAPI app (removed after the port; still in git history before the
`chore: remove the old Vite frontend and FastAPI backend` commit).

## Prerequisites

- Node.js **24 LTS** (`.nvmrc`); npm comes with it
- Docker (for the local Postgres)

## First run

```bash
npm ci
cp .env.development.example .env.development.local   # local DB settings, gitignored
npm run db:dev:up        # postgres:17 in Docker — container shd-career-dev, 127.0.0.1:55434
npm run db:dev:migrate   # apply drizzle/*.sql
npm run db:dev:seed      # sample jobs + made-up applicants (safe to run twice)
npm run dev              # http://localhost:3000 → redirects to /th, /en or /zh
```

Check it works: `curl localhost:3000/api/v1/health` → `{"status":"ok","database":"shd_career_db_dev",...}`

## The three databases

|             | Where                                                                                          | Env file                     | Port  |
| ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------- | ----- |
| development | `docker-compose.yml` (container `shd-career-dev`, db `shd_career_db_dev`, password `dev_pass`) | `.env.development.local`     | 55434 |
| test        | `tests/support/docker-compose.yml` (container `shd-career-test`), wiped each start             | `.env.test.local` (optional) | 55435 |
| production  | Supabase                                                                                       | `.env.local`                 | —     |

The scripts name their target out loud and check it:

- `npm run db:dev:*` — refuses anything that is not on this machine
- `npm run db:prod:migrate` — refuses a local DB, then asks you to type `production`
- `npm run db:migrate:deploy` — Render / CI only (runs as Render's pre-deploy step)
- `npm run dev` refuses a non-local database unless `SHD_ALLOW_PRODUCTION=1`

Never run `drizzle-kit push`. A schema change is a hand-written `drizzle/NNNN_name.sql`
(`npm run db:generate:custom` creates the file and its `meta/_journal.json` entry).

## Files (résumés)

|             | Where                                                | Set by                                                  |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------- |
| development | `./.storage/` on disk (gitignored) — never Supabase  | `STORAGE_DRIVER=local`                                  |
| production  | a **private** Supabase Storage bucket `applications` | `STORAGE_DRIVER=supabase` + `SUPABASE_SERVICE_ROLE_KEY` |

The database keeps only the path. The admin downloads through `/api/v1/admin/applications/{id}/files/{fileId}`,
which signs a 60-second link at the moment of the click.

## The API

- `/api-docs` — the docs page (APIDoc, as in onelink), built by `npm run docs:api` (also runs on `dev` and `build`)
- `/api/v1/openapi.json` — OpenAPI 3.0, **generated from the zod contracts** in `lib/api/contracts.ts`
- `npm run api:test` — the Bruno collection in `bruno/` against the dev server (`npm run api:smoke:prod` = read-only against prod)

Adding an endpoint: declare it in `lib/api/contracts.ts` (its zod schemas), add the `route.ts` that validates with
those same schemas. `tests/api/contracts.test.ts` fails if the two lists differ.

The admin endpoints need the admin's session cookie (sign in at `/sso/login`) and the permission each contract names
(`permission` in `lib/api/contracts.ts`, shown in the docs). Without SSO configured: open in development, `503` in
production. `tests/api/contracts.test.ts` fails if a route checks a different permission than its contract says.

## The admin

`http://localhost:3000/admin` — overview, jobs, applicants, site text. Thai, English or Chinese (header picker, a cookie;
no url prefix). Its text is in `messages/admin/{th,en,zh}.json`, separate from the public site's.

### Sign-in: SHD SSO (as in onelink)

1. `/admin` without a valid session cookie → `proxy.ts` sends the browser to `/sso/login?next=<page>`.
2. `/sso/login` stores a random `state` (cookie, 10 min) and redirects to the central login
   (`SSO_ORIGIN/api/v1/sso/authorize`).
3. The central login sends the browser back to **`/api/sso/callback`** with a one-time code; the server trades it
   for the person's identity (`/api/v1/sso/verify`, with the client secret) and sets `shd_careers_session` — an
   HMAC-signed cookie (`SESSION_SECRET`), 8 hours.
4. On every admin page and API call, what the person may do is asked of the central permission system
   (`/api/v1/authz/effective`, by email, with `CENTRAL_API_KEY`; cached 1 minute, a stale answer trusted up to
   15 minutes while it is down — never "no access" because of an outage).

Sign out (sidebar) ends this app's session only → `/sso/signed-out`.

| Variable                             | What                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET` | from the central console when SSO is switched on for the app (the secret is shown once)  |
| `SESSION_SECRET`                     | ours — `openssl rand -base64 48` (render.yaml generates it)                              |
| `CENTRAL_API_KEY`                    | the app's permission API key (Credentials page) — empty = everyone who signs in gets all |
| `SSO_ORIGIN`                         | default `https://sso.shd-technology.co.th`                                               |
| `SSO_DEBUG`                          | `shape` while setting up — logs what `/sso/verify` answered, without personal data       |

**Redirect URI to register** in the central console, exactly: `<SITE_URL>/api/sso/callback`
(local: `http://localhost:3000/api/sso/callback`).

**Permissions** — three resources, levels `none < view < edit < manage`; no capabilities or scopes.
`python3 scripts/build-sso-schema.py` writes one sheet per kind to `sso-schema/` — `resources.xlsx`,
`capabilities.xlsx` and `scopes.csv` (the last two empty) — to upload on the app's permissions page. Then tick them for
roles: a new resource is nobody's until then.

| Resource       | view                                                                   | edit                                                  | manage                                                              |
| -------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `jobs`         | job list, editor read-only                                             | create, edit, publish/close                           | delete                                                              |
| `applications` | applicants, files, overview, application forms, interviews, their PDFs | stage, notes, evaluate, invite evaluators, edit links | delete applications, forms and evaluations; CSV export; PDPA fields |
| `content`      | site text, read-only                                                   | change and revert                                     | —                                                                   |

**Audit trail** — `admin_audit_logs` (migration 0010): every admin API call that creates, changes or deletes, and
every download of personal data (a resume, a PDF, the CSV export) — who, action, path, record id, status, the JSON sent
(≤ 16 KB), IP. Written in one place, `handler()` → `lib/api/audit.ts`, so a new admin route is covered without doing
anything; refused attempts (403/404) are kept too. Not shown in the app — read it in the database:
`select created_at, actor_email, action, path, status from admin_audit_logs order by pk desc limit 50;`

The menu shows only what the person may open, and buttons they cannot use are hidden — but the lock is on the
server: every API route calls `requireAdmin(request, need)`, every page `requireAdminPage(need)` before reading data
(`tests/api/admin-gate.test.ts` enforces it). Signed in with nothing granted → a "no access" card naming the account,
with "check again" (forgets the cached answer) and "sign out".

**Without SSO configured** (client id/secret empty): development is open, acting as `dev@localhost`; production is
closed — `proxy.ts` answers every `/admin` url with 503 before any page runs, and the API answers 503.

## Time zone (company standard)

OS, app and database all on **Asia/Bangkok**, verified every 90 days:

|          | Set by                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| App      | `TZ=Asia/Bangkok` — required by `lib/env.ts` (the server does not start without it); in `.env.*`, `render.yaml`, CI           |
| Database | migration `0004` (`ALTER DATABASE … SET timezone`) — every session, through both poolers; Docker also starts Postgres with it |
| OS       | the Docker containers (`TZ`); on the server, the host's zone file — reported, see below                                       |

**Verify:** `GET /api/v1/health` → `timeZones: { os, app, db, ok }` on a deployed server, or
`npm run check:timezone` locally (exits 1 if anything is off; CI runs it with `--skip-os`).

Timestamps are stored as instants (`timestamptz`) and the API sends ISO UTC (`…Z`) whatever the zone;
the zone only changes how a time is written as text (`07:30:00+07`) and which day "today" is.

**Log timestamps.** Every app log line has its time with an offset: `"time":"2026-10-07T08:18:41.152+07:00"`
(pino, `lib/time.ts`); so does the env-failure line at startup, and Postgres's own log (`… +07`). The API
sends `…Z`. Either way, never a bare local time — lines from different systems compare exactly.

**Clocks (NTP).** A right zone does not make a right clock. `npm run check:timezone` measures each clock
against **NIMT** (`time1.nimt.or.th`, Thailand's national time, stratum 1) and fails beyond 1 s:
this machine (and the NTP source it is set to), the database, and with `--url https://…` the deployed app
and its database (their clocks are in `/api/v1/health → clock`). Supabase and Render run on managed hosts
whose NTP source cannot be read; the measured drift against NIMT is what gets recorded.

**Daylight saving.** Asia/Bangkok has none (+07:00 all year; tested). No zone with DST is used anywhere,
and the app has no scheduled jobs. If one is added: Render cron schedules are written in **UTC** — Bangkok
is always UTC+7 (09:00 Bangkok = `0 2 * * *`); never schedule in a US/EU zone, whose offset to Bangkok
changes twice a year.

## Checks (the same ones CI runs on every PR)

```bash
npm run lint
npm run typecheck
npm run db:test:up && npm test
npm run check:messages   # every translation key the code uses exists in th, en and zh
npm run check:timezone   # OS, app and database on Asia/Bangkok; clocks within 1 s of NIMT
npm run build
```

## Conventions

- **ids** — every table starts with `pk` (bigint identity, backend only, never in the API/urls/logs)
  then `id` (UUIDv7, the only id that leaves the backend). Foreign keys are `<table>_pk`.
  Helpers: `lib/db/schema/ids.ts`.
- **soft delete** — `status` enum `ACTIVE | INACTIVE | DELETED`; DELETE endpoints set `DELETED`.
- **updated_at** — maintained by the `set_updated_at()` trigger, never by app code.
- **RLS** — enabled with zero policies on every table (the app connects as owner).
- **DB access** — only through `lib/repositories/*` (via `store()`).
- **API errors** — `{ "error": { "code", "message" } }`; inputs validated with zod (`parseBody` / `parseQuery` in `lib/api/http.ts`).
- **logs** — pino JSON; every API response carries `x-request-id`, and every log line for that request has it.
  Never log applicants' personal data.
- **Sentry** — off until `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are set (no account yet). Nothing is sent without them.
- **pinned versions** — `tailwindcss` / `@tailwindcss/postcss` 4.3.3 (the classes were checked against it), and
  `postcss` **8.5.28**: 8.5.29 with Tailwind's plugin writes a source-map entry at column −1 at the end of every CSS
  module, which `next dev` prints as `Invalid mapping: {"generated":{"column":-1,…}}` for each `*.module.css`.
  Harmless (the entry is dropped), but noise. Try 8.5.30+ when it ships, and unpin if the warning is gone.
