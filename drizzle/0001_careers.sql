-- ---------------------------------------------------------------------------
-- 0001 — the careers site: jobs, applications, editable site text.
--
-- Replaces the old Supabase schema (backend/migrations/000–003). What changed,
-- and why:
--
--   jobs.job_id (text pk)        -> pk / id / code (the old id, now a business key)
--   jobs.status draft|published  -> publish_state; `status` is the soft delete
--   title_th/en/zh … columns     -> job_translations, one row per language
--   jobs.country ("Thailand")    -> country_code ('TH'): the old home page linked
--                                   ?country=TH and matched nothing
--   applications.job_id (no FK)  -> jobs_pk with a foreign key; deleting a job
--                                   no longer orphans its applicants
--   applications.status text     -> stage enum + application_stage_changes (trigger)
--   admin_note (overwritten)     -> application_notes, a history with authors
--   resume_url (public URL)      -> application_files.storage_path (private bucket)
--   website_url (anything)       -> http(s) only: javascript: urls were a stored XSS
-- ---------------------------------------------------------------------------


-- === Enums ===================================================================

CREATE TYPE "locale" AS ENUM ('th', 'en', 'zh');
--> statement-breakpoint
CREATE TYPE "job_publish_state" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
--> statement-breakpoint
CREATE TYPE "application_stage" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED');
--> statement-breakpoint
CREATE TYPE "application_file_kind" AS ENUM ('RESUME', 'TRANSCRIPT', 'ATTACHMENT');
--> statement-breakpoint
CREATE TYPE "education_level" AS ENUM (
  'HIGH_SCHOOL', 'VOCATIONAL_CERT', 'HIGHER_VOCATIONAL_CERT', 'DIPLOMA',
  'BACHELOR', 'MASTER', 'DOCTORATE', 'STUDYING', 'INCOMPLETE', 'OTHER'
);
--> statement-breakpoint


-- === jobs ====================================================================

CREATE TABLE "jobs" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "code" text NOT NULL,
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "publish_state" "job_publish_state" NOT NULL DEFAULT 'DRAFT',
  "country_code" char(2) NOT NULL,
  "department" text,
  "level" text,
  "quantity" integer,
  "published_at" timestamptz,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "jobs_code_format" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'),
  CONSTRAINT "jobs_country_code_format" CHECK ("country_code" ~ '^[A-Z]{2}$'),
  CONSTRAINT "jobs_quantity_not_negative" CHECK ("quantity" IS NULL OR "quantity" >= 0),
  CONSTRAINT "jobs_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_id_idx" ON "jobs" ("id");
--> statement-breakpoint
-- A deleted job does not hold its code forever.
CREATE UNIQUE INDEX "jobs_code_live_idx" ON "jobs" ("code") WHERE status <> 'DELETED';
--> statement-breakpoint
CREATE INDEX "jobs_public_idx" ON "jobs" ("publish_state", "status");
--> statement-breakpoint
CREATE INDEX "jobs_country_idx" ON "jobs" ("country_code");
--> statement-breakpoint
CREATE INDEX "jobs_department_idx" ON "jobs" ("department");
--> statement-breakpoint
-- The admin list sorts codes byte-wise (SHD-PH-… before SHD-TH-…, digits before letters).
CREATE INDEX "jobs_code_c_idx" ON "jobs" ("code" COLLATE "C");
--> statement-breakpoint

CREATE TABLE "job_translations" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "jobs_pk" bigint NOT NULL REFERENCES "jobs" ("pk") ON DELETE CASCADE,
  "locale" "locale" NOT NULL,
  "title" text NOT NULL,
  "location" text,
  "description" text,
  "qualifications" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "job_translations_title_not_blank" CHECK (btrim("title") <> '')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "job_translations_id_idx" ON "job_translations" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "job_translations_job_locale_idx" ON "job_translations" ("jobs_pk", "locale");
--> statement-breakpoint


-- === applications ============================================================

CREATE TABLE "applications" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "jobs_pk" bigint NOT NULL REFERENCES "jobs" ("pk"),
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "stage" "application_stage" NOT NULL DEFAULT 'NEW',
  "stage_changed_at" timestamptz,
  "stage_changed_by" text,
  "locale" "locale" NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "residence_country" text,
  "address" text,
  "visa_required" boolean NOT NULL DEFAULT false,
  "available_from" date,
  "website_url" text,
  "source_channel" text,
  "terms_accepted_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "applications_names_not_blank" CHECK (btrim("first_name") <> '' AND btrim("last_name") <> ''),
  CONSTRAINT "applications_email_shape" CHECK ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT "applications_phone_not_blank" CHECK (btrim("phone") <> ''),
  CONSTRAINT "applications_website_http" CHECK ("website_url" IS NULL OR "website_url" ~* '^https?://'),
  CONSTRAINT "applications_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "applications_id_idx" ON "applications" ("id");
--> statement-breakpoint
CREATE INDEX "applications_job_idx" ON "applications" ("jobs_pk");
--> statement-breakpoint
CREATE INDEX "applications_stage_idx" ON "applications" ("stage");
--> statement-breakpoint
CREATE INDEX "applications_created_idx" ON "applications" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX "applications_email_idx" ON "applications" (lower("email"));
--> statement-breakpoint

CREATE TABLE "application_educations" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "applications_pk" bigint NOT NULL REFERENCES "applications" ("pk") ON DELETE CASCADE,
  "position" smallint NOT NULL,
  "level" "education_level",
  "institute" text,
  "program" text,
  "start_month" date,
  "end_month" date,
  "gpa" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "application_educations_months" CHECK (
    ("start_month" IS NULL OR "start_month" = date_trunc('month', "start_month")::date)
    AND ("end_month" IS NULL OR "end_month" = date_trunc('month', "end_month")::date)
    AND ("start_month" IS NULL OR "end_month" IS NULL OR "end_month" >= "start_month")
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_educations_id_idx" ON "application_educations" ("id");
--> statement-breakpoint
CREATE INDEX "application_educations_application_idx" ON "application_educations" ("applications_pk");
--> statement-breakpoint

CREATE TABLE "application_experiences" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "applications_pk" bigint NOT NULL REFERENCES "applications" ("pk") ON DELETE CASCADE,
  "position" smallint NOT NULL,
  "company" text,
  "role" text,
  "start_month" date,
  "end_month" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "application_experiences_months" CHECK (
    ("start_month" IS NULL OR "start_month" = date_trunc('month', "start_month")::date)
    AND ("end_month" IS NULL OR "end_month" = date_trunc('month', "end_month")::date)
    AND ("start_month" IS NULL OR "end_month" IS NULL OR "end_month" >= "start_month")
  )
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_experiences_id_idx" ON "application_experiences" ("id");
--> statement-breakpoint
CREATE INDEX "application_experiences_application_idx" ON "application_experiences" ("applications_pk");
--> statement-breakpoint

CREATE TABLE "application_skills" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "applications_pk" bigint NOT NULL REFERENCES "applications" ("pk") ON DELETE CASCADE,
  "position" smallint NOT NULL,
  "skill" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "application_skills_not_blank" CHECK (btrim("skill") <> '')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_skills_id_idx" ON "application_skills" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "application_skills_unique_idx" ON "application_skills" ("applications_pk", lower("skill"));
--> statement-breakpoint

CREATE TABLE "application_files" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "applications_pk" bigint NOT NULL REFERENCES "applications" ("pk") ON DELETE CASCADE,
  "kind" "application_file_kind" NOT NULL,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "application_files_size_positive" CHECK ("size_bytes" > 0),
  -- A path inside the bucket, never a url: the bucket is private.
  CONSTRAINT "application_files_path_not_url" CHECK ("storage_path" !~* '^[a-z]+://')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_files_id_idx" ON "application_files" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "application_files_path_idx" ON "application_files" ("storage_path");
--> statement-breakpoint
CREATE INDEX "application_files_application_idx" ON "application_files" ("applications_pk");
--> statement-breakpoint
CREATE UNIQUE INDEX "application_files_one_resume_idx" ON "application_files" ("applications_pk") WHERE kind = 'RESUME';
--> statement-breakpoint
CREATE UNIQUE INDEX "application_files_one_transcript_idx" ON "application_files" ("applications_pk") WHERE kind = 'TRANSCRIPT';
--> statement-breakpoint

CREATE TABLE "application_notes" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "applications_pk" bigint NOT NULL REFERENCES "applications" ("pk") ON DELETE CASCADE,
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "body" text NOT NULL,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "application_notes_not_blank" CHECK (btrim("body") <> ''),
  CONSTRAINT "application_notes_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_notes_id_idx" ON "application_notes" ("id");
--> statement-breakpoint
CREATE INDEX "application_notes_application_idx" ON "application_notes" ("applications_pk", "created_at");
--> statement-breakpoint

CREATE TABLE "application_stage_changes" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "applications_pk" bigint NOT NULL REFERENCES "applications" ("pk") ON DELETE CASCADE,
  "from_stage" "application_stage",
  "to_stage" "application_stage" NOT NULL,
  "changed_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "application_stage_changes_id_idx" ON "application_stage_changes" ("id");
--> statement-breakpoint
CREATE INDEX "application_stage_changes_application_idx" ON "application_stage_changes" ("applications_pk", "created_at");
--> statement-breakpoint


-- === site_content ============================================================

CREATE TABLE "site_content" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "key" text NOT NULL,
  "locale" "locale" NOT NULL,
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "value" text NOT NULL,
  "updated_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "site_content_key_format" CHECK ("key" ~ '^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$'),
  CONSTRAINT "site_content_value_length" CHECK (length("value") <= 5000),
  CONSTRAINT "site_content_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "site_content_id_idx" ON "site_content" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "site_content_key_locale_live_idx" ON "site_content" ("key", "locale") WHERE status <> 'DELETED';
--> statement-breakpoint


-- === Triggers ================================================================
--
-- updated_at on every table that has one (set_updated_at() is from 0000).

CREATE TRIGGER "jobs_set_updated_at" BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "job_translations_set_updated_at" BEFORE UPDATE ON "job_translations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "applications_set_updated_at" BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "application_educations_set_updated_at" BEFORE UPDATE ON "application_educations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "application_experiences_set_updated_at" BEFORE UPDATE ON "application_experiences" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "application_skills_set_updated_at" BEFORE UPDATE ON "application_skills" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "application_files_set_updated_at" BEFORE UPDATE ON "application_files" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "application_notes_set_updated_at" BEFORE UPDATE ON "application_notes" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER "site_content_set_updated_at" BEFORE UPDATE ON "site_content" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- jobs.published_at: stamped the first time a job goes PUBLISHED, kept after.

CREATE FUNCTION jobs_stamp_published_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.publish_state = 'PUBLISHED' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "jobs_stamp_published_at" BEFORE INSERT OR UPDATE OF "publish_state" ON "jobs"
  FOR EACH ROW EXECUTE FUNCTION jobs_stamp_published_at();
--> statement-breakpoint

-- applications.stage: stamp stage_changed_at, and record every change.
-- App code sets stage (and stage_changed_by); the database does the rest.

CREATE FUNCTION applications_stamp_stage_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "applications_stamp_stage_change" BEFORE UPDATE OF "stage" ON "applications"
  FOR EACH ROW EXECUTE FUNCTION applications_stamp_stage_change();
--> statement-breakpoint

CREATE FUNCTION applications_record_stage_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO application_stage_changes (applications_pk, from_stage, to_stage, changed_by)
    VALUES (NEW.pk, NULL, NEW.stage, NULL);
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO application_stage_changes (applications_pk, from_stage, to_stage, changed_by)
    VALUES (NEW.pk, OLD.stage, NEW.stage, NEW.stage_changed_by);
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER "applications_record_stage_change" AFTER INSERT OR UPDATE OF "stage" ON "applications"
  FOR EACH ROW EXECUTE FUNCTION applications_record_stage_change();
--> statement-breakpoint

COMMENT ON TABLE "application_stage_changes" IS
  'Written ONLY by the applications_record_stage_change trigger. Never insert from application code.';
--> statement-breakpoint
COMMENT ON COLUMN "jobs"."published_at" IS
  'Set by the jobs_stamp_published_at trigger the first time publish_state becomes PUBLISHED.';
--> statement-breakpoint
COMMENT ON COLUMN "applications"."website_url" IS
  'http(s) only (CHECK). The old site accepted javascript: urls and rendered them as links in the admin.';
--> statement-breakpoint


-- === Row level security: on, zero policies, every table ======================

ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "job_translations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "application_educations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "application_experiences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "application_skills" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "application_files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "application_notes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "application_stage_changes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "site_content" ENABLE ROW LEVEL SECURITY;
