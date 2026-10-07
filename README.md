# SHD Careers

The SHD Technology careers site — public pages in Thai, English and Chinese, the HR admin, and the API
behind both. One Next.js app.

|             |                                                                                         |
| ----------- | --------------------------------------------------------------------------------------- |
| Public site | `/th`, `/en`, `/zh` — jobs, job detail, application form, about, why SHD                |
| Admin       | `/admin` — overview, jobs, applicants, site text (Thai / English); sign-in with SHD SSO |
| API         | `/api/v1` — docs at `/api-docs`, OpenAPI at `/api/v1/openapi.json`                      |

**Stack:** Node 24 · Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/ui (Radix) · next-intl ·
Drizzle ORM · Postgres 17 (Supabase in production, Docker locally) · zod · pino · Vitest · Render + Cloudflare.

## Start

```bash
npm ci
cp .env.development.example .env.development.local
npm run db:dev:up && npm run db:dev:migrate && npm run db:dev:seed
npm run dev        # http://localhost:3100
```

## Docs

- [docs/setup.md](docs/setup.md) — local setup, the three databases, checks, conventions, the admin and its SSO sign-in
- [docs/ui-port.md](docs/ui-port.md) — how the pages were ported from the old site without changing the look
- [docs/legacy-import.md](docs/legacy-import.md) — importing the old system's data
- [docs/api/guides](docs/api/guides) — API guides (th / en)
