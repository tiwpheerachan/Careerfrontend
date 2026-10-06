import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { testDb } from '@/tests/support/db';

/** What migration 0000 promises every later table. */
describe('migration 0000', () => {
  it('mints time-ordered UUIDv7 ids', async () => {
    const rows = (await testDb.execute(
      sql`select uuid_generate_v7()::text as a, uuid_generate_v7(clock_timestamp() + interval '1 second')::text as b`,
    )) as unknown as Array<{ a: string; b: string }>;
    const { a, b } = rows[0]!;

    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });

  it('moves updated_at on every UPDATE, whatever the statement sets', async () => {
    await testDb.execute(
      sql`insert into rate_limits (subject, window_start, updated_at) values ('t', now(), '2000-01-01')`,
    );
    await testDb.execute(sql`update rate_limits set count = 5 where subject = 't'`);
    const rows = (await testDb.execute(
      sql`select updated_at > now() - interval '1 minute' as fresh from rate_limits where subject = 't'`,
    )) as unknown as Array<{ fresh: boolean }>;
    expect(rows[0]!.fresh).toBe(true);
  });

  it('has row level security on, with no policies, for every table', async () => {
    const rows = (await testDb.execute(sql`
      select c.relname as table, c.relrowsecurity as rls,
             (select count(*) from pg_policies p where p.tablename = c.relname)::int as policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname <> '__drizzle_migrations'
    `)) as unknown as Array<{ table: string; rls: boolean; policies: number }>;

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row, row.table).toMatchObject({ rls: true, policies: 0 });
  });
});
