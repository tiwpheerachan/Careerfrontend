-- ---------------------------------------------------------------------------
-- 0010 — the admin audit trail (2026-10-08).
--
--   admin_audit_logs
--       one row per admin API call that creates, changes or deletes, or that
--       takes personal data out (a resume, a PDF, the CSV export): who, what,
--       which record, the outcome, and what was sent. Append only; written by
--       lib/api/audit.ts and never shown in the app.
-- ---------------------------------------------------------------------------

CREATE TABLE "admin_audit_logs" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "actor_email" text NOT NULL,
  "actor_name" text,
  "action" text NOT NULL CHECK ("action" IN ('create', 'update', 'delete', 'download')),
  "method" text NOT NULL,
  "path" text NOT NULL,
  "resource" text NOT NULL,
  "target_id" text,
  "status" smallint NOT NULL,
  "body" jsonb,
  "ip" text,
  "request_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_idx" ON "admin_audit_logs" ("actor_email", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" ("resource", "target_id");
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ENABLE ROW LEVEL SECURITY;
