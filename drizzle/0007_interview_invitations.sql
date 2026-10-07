-- ---------------------------------------------------------------------------
-- 0007 — inviting people to evaluate an interview, without a role.
--
-- HR picks people from the company directory and gets one link for them all.
-- Opening it needs an SSO sign-in AS ONE OF THOSE PEOPLE — the invitation is
-- this app's own grant for one candidate, one round, one side; the central
-- role system is not asked. (A new employee signing in for the first time
-- has no role, and needs none to evaluate.)
--
--   unopened   the link works for 24 hours after it is made
--   opened     the first invited person to open it starts 6 more hours,
--              for everyone on it
--   submitted  each person evaluates once; their part of the link closes
--   revoked    HR switched it off
--
-- The times are applied in lib/interview/invitations.ts. The token is kept as
-- is (so HR can copy the link again): on its own it opens nothing — the
-- holder must also be signed in as someone on the list.
-- ---------------------------------------------------------------------------

CREATE TABLE "interview_invitations" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "token" text NOT NULL,
  "applications_pk" bigint REFERENCES "applications" ("pk"),
  "application_forms_pk" bigint REFERENCES "application_forms" ("pk"),
  "candidate_name" text NOT NULL,
  "position" text,
  "department" text,
  "round" smallint NOT NULL,
  "evaluator_role" "evaluator_role" NOT NULL,
  "created_by" text NOT NULL,
  "opened_at" timestamptz,
  "revoked_at" timestamptz,
  "revoked_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "interview_invitations_token_long" CHECK (length("token") >= 32),
  CONSTRAINT "interview_invitations_one_candidate" CHECK (num_nonnulls("applications_pk", "application_forms_pk") <= 1),
  CONSTRAINT "interview_invitations_name_not_blank" CHECK (btrim("candidate_name") <> ''),
  CONSTRAINT "interview_invitations_round" CHECK ("round" IN (1, 2)),
  CONSTRAINT "interview_invitations_revoked_consistent" CHECK (("revoked_at" IS NULL) = ("revoked_by" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_invitations_id_idx" ON "interview_invitations" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_invitations_token_idx" ON "interview_invitations" ("token");
--> statement-breakpoint
CREATE INDEX "interview_invitations_application_idx" ON "interview_invitations" ("applications_pk");
--> statement-breakpoint
CREATE INDEX "interview_invitations_form_idx" ON "interview_invitations" ("application_forms_pk");
--> statement-breakpoint
CREATE TRIGGER "interview_invitations_set_updated_at" BEFORE UPDATE ON "interview_invitations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TABLE "interview_invitees" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "interview_invitations_pk" bigint NOT NULL REFERENCES "interview_invitations" ("pk") ON DELETE CASCADE,
  "email" text NOT NULL,
  "name" text,
  "union_id" text,
  "job_title" text,
  "department" text,
  "opened_at" timestamptz,
  "submitted_at" timestamptz,
  "interview_evaluations_pk" bigint REFERENCES "interview_evaluations" ("pk"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "interview_invitees_email_shape" CHECK ("email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT "interview_invitees_submitted_consistent" CHECK (("submitted_at" IS NULL) = ("interview_evaluations_pk" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_invitees_id_idx" ON "interview_invitees" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_invitees_email_idx" ON "interview_invitees" ("interview_invitations_pk", lower("email"));
--> statement-breakpoint
CREATE TRIGGER "interview_invitees_set_updated_at" BEFORE UPDATE ON "interview_invitees" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
ALTER TABLE "interview_evaluations" ADD COLUMN "interview_invitations_pk" bigint REFERENCES "interview_invitations" ("pk");
--> statement-breakpoint
COMMENT ON COLUMN "interview_evaluations"."interview_invitations_pk" IS
  'The invitation it was sent through, if any (a guest evaluator without a role).';
--> statement-breakpoint
ALTER TABLE "interview_invitations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "interview_invitees" ENABLE ROW LEVEL SECURITY;
