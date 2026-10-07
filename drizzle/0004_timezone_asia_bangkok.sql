-- ---------------------------------------------------------------------------
-- 0004 — the database's time zone: Asia/Bangkok (company standard).
--
-- Set on the DATABASE, so every new session gets it — through Supabase's
-- transaction pooler (6543) and session pooler (5432) alike, and in the local
-- containers. Existing sessions keep theirs until they reconnect.
--
-- Stored data does not change: timestamptz columns hold an instant, and the
-- zone only decides how one is written as text (14:24:50+07 rather than
-- 07:24:50+00 — the same moment) and which calendar day `now()::date` is.
-- The application's queries name their zone explicitly where a day matters.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Bangkok');
END
$$;
