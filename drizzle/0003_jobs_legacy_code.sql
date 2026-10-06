-- ---------------------------------------------------------------------------
-- 0003 — the old site's job ids, so old links keep working.
--
-- The old system's job_id was free text ("SHD-TH- Accounting - AP"), used in
-- shared urls (/jobs/SHD-TH-%20Accounting%20-%20AP). Imported jobs get a clean
-- code (SHD-TH-ACCOUNTING-AP) and keep the old id here; a url carrying the old
-- id is redirected (308) to the new one. Null for jobs made in the new system.
-- ---------------------------------------------------------------------------

ALTER TABLE "jobs" ADD COLUMN "legacy_code" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_legacy_code_idx" ON "jobs" (lower(btrim("legacy_code"))) WHERE "legacy_code" IS NOT NULL;
--> statement-breakpoint
COMMENT ON COLUMN "jobs"."legacy_code" IS
  'The old system''s job_id, kept for redirecting old links (lib/repositories/jobs.ts codeForLegacy). Set only by scripts/import-legacy.ts.';
