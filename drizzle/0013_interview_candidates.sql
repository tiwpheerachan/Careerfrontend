-- ---------------------------------------------------------------------------
-- 0013 — candidates without an application yet (2026-10-16).
--
-- Applicants usually fill in the application form after the interview, but
-- the hiring department evaluates before that. HR adds the candidate here
-- (name, position, department, phone, optionally a résumé), invites and
-- evaluates as for anyone else, and later links the row to the application
-- or form once it exists: the evaluations and invitations then belong to it.
--
--   interview_candidates                 the candidate HR added
--     phone                              HR's, to tell people with the same
--                                        name apart and to find their form;
--                                        never shown to an invited evaluator
--     resume_*                           optional, all three or none
--     linked_applications_pk /           what it was linked to (at most one);
--     linked_application_forms_pk        set once, with linked_at/_by
--
--   interview_evaluations.interview_candidates_pk
--   interview_invitations.interview_candidates_pk
--       the candidate HR added. Kept after linking (history); the
--       application or form link then decides whose they are.
-- ---------------------------------------------------------------------------

CREATE TABLE "interview_candidates" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "name" text NOT NULL,
  "position" text,
  "department" text,
  "phone" text,
  "resume_path" text,
  "resume_name" text,
  "resume_type" text,
  "linked_applications_pk" bigint REFERENCES "applications" ("pk"),
  "linked_application_forms_pk" bigint REFERENCES "application_forms" ("pk"),
  "linked_at" timestamptz,
  "linked_by" text,
  "created_by" text NOT NULL,
  "created_by_name" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "interview_candidates_name_not_blank" CHECK (btrim("name") <> ''),
  CONSTRAINT "interview_candidates_resume_complete"
    CHECK (("resume_path" IS NULL) = ("resume_name" IS NULL) AND ("resume_path" IS NULL) = ("resume_type" IS NULL)),
  CONSTRAINT "interview_candidates_one_link" CHECK (num_nonnulls("linked_applications_pk", "linked_application_forms_pk") <= 1),
  CONSTRAINT "interview_candidates_linked_consistent"
    CHECK ((num_nonnulls("linked_applications_pk", "linked_application_forms_pk") = 1) = ("linked_at" IS NOT NULL)
       AND ("linked_at" IS NULL) = ("linked_by" IS NULL)),
  CONSTRAINT "interview_candidates_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_candidates_id_idx" ON "interview_candidates" ("id");
--> statement-breakpoint
CREATE INDEX "interview_candidates_created_idx" ON "interview_candidates" ("created_at" DESC);
--> statement-breakpoint
CREATE TRIGGER "interview_candidates_set_updated_at" BEFORE UPDATE ON "interview_candidates" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
ALTER TABLE "interview_candidates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "interview_evaluations" ADD COLUMN "interview_candidates_pk" bigint REFERENCES "interview_candidates" ("pk");
--> statement-breakpoint
CREATE INDEX "interview_evaluations_candidate_idx" ON "interview_evaluations" ("interview_candidates_pk");
--> statement-breakpoint
ALTER TABLE "interview_invitations" ADD COLUMN "interview_candidates_pk" bigint REFERENCES "interview_candidates" ("pk");
--> statement-breakpoint
CREATE INDEX "interview_invitations_candidate_idx" ON "interview_invitations" ("interview_candidates_pk");
