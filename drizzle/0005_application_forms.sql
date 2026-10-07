-- ---------------------------------------------------------------------------
-- 0005 — the paper application form (ใบสมัครงาน), filled in on the public site.
--
-- One row per form sent from /application-form. Not an application to a job
-- (that is `applications`, with its files and hiring stage): this is the
-- company's own one-page form, kept to be printed onto its blank PDF
-- (lib/application-form/pdf.tsx).
--
--   answers    every section of the form (lib/application-form/schema.ts), as
--              sent. Only what the admin lists and searches by has a column.
--   sensitive  ethnicity, religion, blood type, weight, height — PDPA s.26.
--              Only with its own consent (CHECK), and only shown to admins
--              with manage on applications.
-- ---------------------------------------------------------------------------

CREATE TYPE "application_form_letterhead" AS ENUM ('SHD', 'RABBIT', 'TOPONE', 'PLAIN');
--> statement-breakpoint
CREATE TABLE "application_forms" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "locale" "locale" NOT NULL,
  "letterhead" "application_form_letterhead" NOT NULL,
  "jobs_pk" bigint REFERENCES "jobs" ("pk"),
  "position" text NOT NULL,
  "name_th" text NOT NULL,
  "name_en" text,
  "email" text NOT NULL,
  "mobile" text NOT NULL,
  "answers" jsonb NOT NULL,
  "sensitive" jsonb,
  "sensitive_consent_at" timestamptz,
  "certified_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "application_forms_position_not_blank" CHECK (btrim("position") <> ''),
  CONSTRAINT "application_forms_name_not_blank" CHECK (btrim("name_th") <> ''),
  CONSTRAINT "application_forms_email_shape" CHECK ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT "application_forms_mobile_not_blank" CHECK (btrim("mobile") <> ''),
  CONSTRAINT "application_forms_answers_object" CHECK (jsonb_typeof("answers") = 'object'),
  CONSTRAINT "application_forms_sensitive_consented" CHECK ("sensitive" IS NULL OR "sensitive_consent_at" IS NOT NULL),
  CONSTRAINT "application_forms_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_forms_id_idx" ON "application_forms" ("id");
--> statement-breakpoint
CREATE INDEX "application_forms_job_idx" ON "application_forms" ("jobs_pk");
--> statement-breakpoint
CREATE INDEX "application_forms_created_idx" ON "application_forms" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX "application_forms_email_idx" ON "application_forms" (lower("email"));
--> statement-breakpoint
CREATE TRIGGER "application_forms_set_updated_at" BEFORE UPDATE ON "application_forms" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
COMMENT ON COLUMN "application_forms"."position" IS
  'The job''s Thai title when it was sent (kept even if the job is renamed), or what the applicant wrote.';
--> statement-breakpoint
COMMENT ON COLUMN "application_forms"."sensitive" IS
  'PDPA s.26 (ethnicity, religion, blood type, weight, height). Stored only with consent; shown only to manage.';
--> statement-breakpoint
ALTER TABLE "application_forms" ENABLE ROW LEVEL SECURITY;
