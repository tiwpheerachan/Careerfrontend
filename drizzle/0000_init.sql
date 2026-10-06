-- ---------------------------------------------------------------------------
-- 0000 — the foundations every later table builds on.
--
--   uuid_generate_v7()   the default for every table's public `id`
--   set_updated_at()     the trigger that keeps every `updated_at` honest
--   status               ACTIVE / INACTIVE / DELETED, the soft-delete lifecycle
--   rate_limits          one row per caller, moved by a single UPSERT
--
-- Hand-written SQL, listed in meta/_journal.json. Never `drizzle-kit push`.
-- ---------------------------------------------------------------------------


-- === Public ids ============================================================

CREATE OR REPLACE FUNCTION uuid_generate_v7(ts timestamptz DEFAULT clock_timestamp())
RETURNS uuid
LANGUAGE sql
VOLATILE
AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          PLACING substring(int8send((extract(epoch FROM ts) * 1000)::bigint) FROM 3)
          FROM 1 FOR 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid
$$;
--> statement-breakpoint

COMMENT ON FUNCTION uuid_generate_v7(timestamptz) IS
  'UUIDv7 (RFC 9562): Unix milliseconds of ts, then randomness. Default for every id column. Replace with the built-in uuidv7() once on Postgres 18.';
--> statement-breakpoint


-- === updated_at ============================================================
--
-- Maintained by the database, never by application code: an UPDATE that
-- forgets to set it (a script, a hand-run fix, a future repository) still
-- moves it. Attach to every table with an updated_at column:
--
--   CREATE TRIGGER <table>_set_updated_at BEFORE UPDATE ON <table>
--     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
--> statement-breakpoint

COMMENT ON FUNCTION set_updated_at() IS
  'BEFORE UPDATE trigger: sets updated_at = now(). Every table with an updated_at column has one; application code never writes updated_at.';
--> statement-breakpoint


-- === Lifecycle =============================================================

CREATE TYPE "status" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');
--> statement-breakpoint

COMMENT ON TYPE "status" IS
  'ACTIVE = live; INACTIVE = kept but switched off; DELETED = soft-deleted, hidden from lists by default. DELETE endpoints set DELETED and never remove rows.';
--> statement-breakpoint


-- === Rate limits ===========================================================

CREATE TABLE "rate_limits" (
  "pk" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "subject" text NOT NULL,
  "window_start" timestamptz NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX "rate_limits_id_idx" ON "rate_limits" ("id");
--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_subject_idx" ON "rate_limits" ("subject");
--> statement-breakpoint

CREATE TRIGGER "rate_limits_set_updated_at" BEFORE UPDATE ON "rate_limits"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

COMMENT ON TABLE "rate_limits" IS
  'One row per caller (ip:<addr> or user:<email>), overwritten when its window turns over. Moved only by the single UPSERT in lib/repositories/rate-limits.ts.';
--> statement-breakpoint


-- === Row level security ====================================================
--
-- ENABLED with ZERO policies on every table: deny-all for every role except
-- the owner, which is what the app connects as. Supabase's anon and
-- authenticated roles — what the publishable key would use — see nothing.
-- Every new table gets the same line in the migration that creates it.

ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
