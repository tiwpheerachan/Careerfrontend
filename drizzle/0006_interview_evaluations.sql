-- ---------------------------------------------------------------------------
-- 0006 — interview evaluations (แบบประเมินผลสัมภาษณ์), filled in by HR and the
-- hiring department in the admin.
--
-- One row = one evaluator's scores for one candidate in one round (1st or
-- 2nd interview). The admin groups them by candidate.
--
-- The candidate is an application (applications_pk), an application form
-- (application_forms_pk), or neither — typed in by hand. At most one link.
-- The name, position and department are copied in either way, as the paper
-- form has them, so the evaluation reads the same if the application changes.
--
-- Scores: ten general items 0–5, and five more for Senior positions (CHECKs
-- keep the arrays the right length and in range). The totals are stored for
-- listing and sorting; lib/interview/scoring.ts computes them and the pass
-- mark, and a CHECK keeps them matching the arrays.
-- ---------------------------------------------------------------------------

CREATE TYPE "evaluator_role" AS ENUM ('HR', 'DEPARTMENT');
--> statement-breakpoint
CREATE TYPE "evaluation_result" AS ENUM ('PENDING', 'PASS', 'FAIL');
--> statement-breakpoint
CREATE FUNCTION "scores_valid"(scores smallint[], expected int) RETURNS boolean
  LANGUAGE sql IMMUTABLE AS $$
    SELECT array_length(scores, 1) = expected
       AND array_ndims(scores) = 1
       AND NOT EXISTS (SELECT 1 FROM unnest(scores) s WHERE s IS NULL OR s < 0 OR s > 5)
  $$;
--> statement-breakpoint
CREATE FUNCTION "scores_sum"(scores smallint[]) RETURNS int
  LANGUAGE sql IMMUTABLE AS $$ SELECT coalesce(sum(s), 0)::int FROM unnest(scores) s $$;
--> statement-breakpoint
CREATE TABLE "interview_evaluations" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "status" "status" NOT NULL DEFAULT 'ACTIVE',
  "deleted_at" timestamptz,
  "deleted_by" text,
  "applications_pk" bigint REFERENCES "applications" ("pk"),
  "application_forms_pk" bigint REFERENCES "application_forms" ("pk"),
  "candidate_name" text NOT NULL,
  "position" text,
  "department" text,
  "interview_date" date NOT NULL,
  "round" smallint NOT NULL,
  "evaluator_role" "evaluator_role" NOT NULL,
  "evaluator_email" text NOT NULL,
  "evaluator_name" text,
  "senior" boolean NOT NULL DEFAULT false,
  "general_scores" smallint[] NOT NULL,
  "senior_scores" smallint[],
  "general_total" smallint NOT NULL,
  "senior_total" smallint,
  "result" "evaluation_result" NOT NULL,
  "fail_reason" text,
  "comment" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "interview_evaluations_one_candidate" CHECK (num_nonnulls("applications_pk", "application_forms_pk") <= 1),
  CONSTRAINT "interview_evaluations_name_not_blank" CHECK (btrim("candidate_name") <> ''),
  CONSTRAINT "interview_evaluations_round" CHECK ("round" IN (1, 2)),
  CONSTRAINT "interview_evaluations_general_scores" CHECK (scores_valid("general_scores", 10)),
  CONSTRAINT "interview_evaluations_senior_scores" CHECK (
    ("senior" AND "senior_scores" IS NOT NULL AND scores_valid("senior_scores", 5))
    OR (NOT "senior" AND "senior_scores" IS NULL)
  ),
  CONSTRAINT "interview_evaluations_totals" CHECK (
    "general_total" = scores_sum("general_scores")
    AND "senior_total" IS NOT DISTINCT FROM (CASE WHEN "senior" THEN scores_sum("senior_scores") END)
  ),
  CONSTRAINT "interview_evaluations_deleted_consistent" CHECK (("status" = 'DELETED') = ("deleted_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "interview_evaluations_id_idx" ON "interview_evaluations" ("id");
--> statement-breakpoint
CREATE INDEX "interview_evaluations_application_idx" ON "interview_evaluations" ("applications_pk");
--> statement-breakpoint
CREATE INDEX "interview_evaluations_form_idx" ON "interview_evaluations" ("application_forms_pk");
--> statement-breakpoint
CREATE INDEX "interview_evaluations_date_idx" ON "interview_evaluations" ("interview_date" DESC, "created_at" DESC);
--> statement-breakpoint
CREATE TRIGGER "interview_evaluations_set_updated_at" BEFORE UPDATE ON "interview_evaluations" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
COMMENT ON COLUMN "interview_evaluations"."evaluator_email" IS
  'Who filled it in — the signed-in admin (SSO), never typed. Only they (or manage) may change it.';
--> statement-breakpoint
ALTER TABLE "interview_evaluations" ENABLE ROW LEVEL SECURITY;
