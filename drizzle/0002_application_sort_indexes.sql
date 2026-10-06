-- ---------------------------------------------------------------------------
-- 0002 — indexes behind the admin's sortable applicant list.
--
-- Names sort byte-wise (COLLATE "C"), as lib/repositories/applications.ts
-- orders them; the index has to use the same collation to be usable.
-- Only rows that are not deleted are ever listed.
-- ---------------------------------------------------------------------------

CREATE INDEX "applications_name_c_idx" ON "applications" ("first_name" COLLATE "C", "last_name" COLLATE "C", "pk")
  WHERE status <> 'DELETED';
--> statement-breakpoint
CREATE INDEX "applications_stage_created_idx" ON "applications" ("stage", "created_at" DESC)
  WHERE status <> 'DELETED';
