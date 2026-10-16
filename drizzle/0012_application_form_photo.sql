-- ---------------------------------------------------------------------------
-- 0012 — the applicant's photo with the application form (2026-10-16).
--
--   application_forms.photo_path / photo_type
--       the object path in storage and its content type (image/jpeg or
--       image/png), printed into the form's photo box. Both or neither.
-- ---------------------------------------------------------------------------

ALTER TABLE "application_forms" ADD COLUMN "photo_path" text;
--> statement-breakpoint
ALTER TABLE "application_forms" ADD COLUMN "photo_type" text;
--> statement-breakpoint
ALTER TABLE "application_forms" ADD CONSTRAINT "application_forms_photo_complete"
  CHECK (("photo_path" IS NULL) = ("photo_type" IS NULL));
