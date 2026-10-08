-- ---------------------------------------------------------------------------
-- 0011 — a résumé/CV with the application form (2026-10-08).
--
--   application_forms.resume_path / resume_name / resume_type
--       optional: the object path in storage (never the bytes or a url, as
--       application_files), the name it was sent under, and its content type.
--       All three or none.
-- ---------------------------------------------------------------------------

ALTER TABLE "application_forms" ADD COLUMN "resume_path" text;
--> statement-breakpoint
ALTER TABLE "application_forms" ADD COLUMN "resume_name" text;
--> statement-breakpoint
ALTER TABLE "application_forms" ADD COLUMN "resume_type" text;
--> statement-breakpoint
ALTER TABLE "application_forms" ADD CONSTRAINT "application_forms_resume_complete"
  CHECK (("resume_path" IS NULL) = ("resume_name" IS NULL) AND ("resume_path" IS NULL) = ("resume_type" IS NULL));
