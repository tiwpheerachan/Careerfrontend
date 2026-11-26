-- ---------------------------------------------------------------------------
-- 0014 — a form sent twice is saved once (2026-11-26).
--
--   applications.submission_id / application_forms.submission_id
--       a uuid the browser makes from what is being sent (x-submission-id).
--       After a lost answer (a 502, a dropped connection) the same form sent
--       again has the same id and is answered with the row already there.
--       Null for older rows and for callers that send none.
--
-- Old code ignores both columns, so this can run before it is replaced.
-- ---------------------------------------------------------------------------

SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "submission_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "applications_submission_idx" ON "applications" ("submission_id");
--> statement-breakpoint
ALTER TABLE "application_forms" ADD COLUMN "submission_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "application_forms_submission_idx" ON "application_forms" ("submission_id");
