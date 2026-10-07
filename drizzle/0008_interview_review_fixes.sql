-- ---------------------------------------------------------------------------
-- 0008 — after the interview review (2026-10-07).
--
--   interview_evaluations.edited_by / edited_at
--       someone other than the evaluator (manage) changed it — shown on the
--       evaluation and its PDF, so a change to what an invited evaluator sent
--       is never silent.
--   interview_invitations.senior
--       HR decides at invitation time whether items 11–15 are scored; the
--       invited evaluators no longer each decide for themselves.
--   interview_invitations.created_by_name
--       shown instead of the email.
-- ---------------------------------------------------------------------------

ALTER TABLE "interview_evaluations" ADD COLUMN "edited_by" text;
--> statement-breakpoint
ALTER TABLE "interview_evaluations" ADD COLUMN "edited_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_edited_consistent"
  CHECK (("edited_by" IS NULL) = ("edited_at" IS NULL));
--> statement-breakpoint
ALTER TABLE "interview_invitations" ADD COLUMN "senior" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "interview_invitations" ADD COLUMN "created_by_name" text;
