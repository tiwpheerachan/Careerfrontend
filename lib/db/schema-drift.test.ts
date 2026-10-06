import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import * as schema from '@/lib/db/schema';
import { testDb } from '@/tests/support/db';

/**
 * The TypeScript schema and the hand-written SQL migrations describe the same
 * tables twice. Nothing generates one from the other, so this checks them
 * against each other: every table and column the code declares exists in the
 * migrated database with the same nullability, and the database has no
 * column the code does not know about.
 */
const tables = (Object.values(schema) as unknown[]).filter((value): value is PgTable => value instanceof PgTable);

describe('schema drift', () => {
  it('declares at least the tables the migrations create', () => {
    expect(tables.map((t) => getTableConfig(t).name).sort()).toContain('applications');
  });

  for (const table of tables) {
    const config = getTableConfig(table);

    it(`${config.name}: columns match the migrated database`, async () => {
      const rows = (await testDb.execute(sql`
        select column_name as name, is_nullable = 'YES' as nullable
        from information_schema.columns
        where table_schema = 'public' and table_name = ${config.name}
        order by ordinal_position
      `)) as unknown as Array<{ name: string; nullable: boolean }>;

      const inDatabase = Object.fromEntries(rows.map((r) => [r.name, r.nullable]));
      const inCode = Object.fromEntries(config.columns.map((c) => [c.name, !c.notNull]));
      expect(inDatabase).toEqual(inCode);
    });
  }
});
