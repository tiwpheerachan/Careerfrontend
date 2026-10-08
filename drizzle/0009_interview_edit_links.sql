-- ---------------------------------------------------------------------------
-- 0009 — edit links (2026-10-08).
--
--   interview_invitations.interview_evaluations_pk
--       set: the link is for changing that one evaluation, not for a new one.
--       An evaluation is read only in the admin; to change it, someone with
--       applications.edit makes a link for its evaluator, under the same rules
--       as an invitation (24 hours unopened, 6 once opened, sent once).
-- ---------------------------------------------------------------------------

ALTER TABLE "interview_invitations"
  ADD COLUMN "interview_evaluations_pk" bigint REFERENCES "interview_evaluations" ("pk");
--> statement-breakpoint
CREATE INDEX "interview_invitations_evaluation_idx" ON "interview_invitations" ("interview_evaluations_pk");
