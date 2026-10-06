# SHD Careers — local setup

Next.js 16 (App Router) + Drizzle + Postgres 17. One app for the public site, the admin and the API.
`frontend/` and `backend/` are the old Vite + FastAPI app, kept only as a reference while it is ported.

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
npm run dev              # http://localhost:3100 → redirects to /th, /en or /zh
```

Check it works: `curl localhost:3100/api/v1/health` → `{"status":"ok","database":"shd_career_db_dev",...}`

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

The admin endpoints have **no sign-in yet** (SSO comes later): open in development, `503` in production.
`lib/auth/admin.ts` is the one place that changes when SSO lands.

## The admin

`http://localhost:3100/admin` — overview, jobs, applicants, site text. Thai or English (header picker, a cookie;
no url prefix). Its text is in `messages/admin/{th,en}.json`, separate from the public site's.

**No sign-in yet** (SSO comes later, as in onelink). Development: open, acting as `dev@localhost`.
Production: closed — `proxy.ts` answers every `/admin` url with 503 before any page runs, the API answers 503,
and every admin page calls `requireAdminPage()` before reading data (`tests/api/admin-gate.test.ts` enforces it).
When SSO lands, `lib/auth/admin.ts` and the `/admin` branch of `proxy.ts` are the two places that change.

## Checks (the same ones CI runs on every PR)

```bash
npm run lint
npm run typecheck
npm run db:test:up && npm test
npm run check:messages   # every translation key the code uses exists in th, en and zh
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
