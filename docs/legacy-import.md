# Importing the old system's data

The old site's data (Supabase project `yqofedmxrrurpjfaocys`) is brought over by
`scripts/import-legacy.ts`. The old project is **never written to**: it is read once with
`pg_dump`, the dump is loaded into a local scratch database, and the script reads only that.

## 1. Dump the old project (read-only)

Outside this repo — the dump holds applicants' personal data. Session pooler, port 5432
(the direct host is IPv6-only):

```bash
cd ../old-dump                      # beside the repo, not in it
# OLD_DB_PASSWORD=... in .env.old
./dump-old.sh aws-1-ap-southeast-1.pooler.supabase.com    # → old-schema.sql, old-data.sql
```

## 2. Load it into a local scratch database

```bash
docker exec shd-career-dev psql -U root -d postgres -c "DROP DATABASE IF EXISTS old_snapshot" -c "CREATE DATABASE old_snapshot"
docker exec shd-career-dev psql -U root -d old_snapshot -c "DROP SCHEMA public CASCADE"
docker exec -i shd-career-dev psql -U root -d old_snapshot -v ON_ERROR_STOP=1 < ../old-dump/old-schema.sql
docker exec -i shd-career-dev psql -U root -d old_snapshot -v ON_ERROR_STOP=1 < ../old-dump/old-data.sql
```

## 3. Import — development first, then production

```bash
npm run db:dev:import-legacy -- --dry-run    # checks everything, writes nothing
npm run db:dev:import-legacy                 # local DB + .storage/
```

Production (after `npm run db:prod:migrate`, with `.env.local` holding the new project's
`DIRECT_URL`, `STORAGE_DRIVER=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
and the private bucket `applications` created):

```bash
npm run db:prod:import-legacy -- --dry-run   # asks you to type "production"
npm run db:prod:import-legacy
```

Safe to run again (e.g. a final run at cut-over to pick up late applications): imported jobs
(by `legacy_code`) and applications (by their old uuid) are skipped.

## What becomes what (lib/legacy/map.ts, tested in map.test.ts)

| Old                                        | New                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `jobs.job_id` "SHD-TH- Accounting - AP"    | `code` SHD-TH-ACCOUNTING-AP; the old id kept in `legacy_code` — old links 308 to the new url  |
| `jobs.country` "Thailand"                  | `country_code` TH                                                                             |
| `jobs.status` draft/published/closed       | `publish_state`                                                                               |
| `title_th/en/zh` …                         | `job_translations`; a language with text but no title borrows one (as the old site showed it) |
| application whose `job_id` has no job      | kept, under a CLOSED placeholder job "Position from the old system (…)"                       |
| `applications.id`                          | kept as `id`                                                                                  |
| `status` new/reviewing/…                   | `stage` NEW/REVIEWING/…; history dated when they applied / were reviewed                      |
| `admin_note`                               | the first note in the history                                                                 |
| `degree_level` "Bachelor’s Degree"         | `level` BACHELOR                                                                              |
| months "" (never saved by the old backend) | null                                                                                          |
| `website_url` "www.x.com/…" / "-"          | https://www.x.com/… / null                                                                    |
| résumé / attachment public urls            | files copied into this target's storage (private bucket in production)                        |

## Afterwards

- Delete `../old-dump/` and the `old_snapshot` database (`DROP DATABASE old_snapshot`).
- Rotate the old project's keys (they were committed in `backend/.env`) — once the old site is retired.
