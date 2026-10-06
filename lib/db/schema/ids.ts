import { sql } from 'drizzle-orm';
import { bigint, uuid } from 'drizzle-orm/pg-core';

/**
 * The id columns, declared once so every table spells them the same way and
 * puts them first. The rule, for every table:
 *
 *   pk   bigint identity, the primary key, for the backend only. Every foreign
 *        key points at it — named `<table>_pk` after the table it points at
 *        (`jobs_pk`, `applications_pk`) — and every join is on it. It never
 *        leaves the repositories: not in the API, not in urls, not in logs.
 *   id   a UUIDv7 the database mints (uuid_generate_v7(), migration 0000), and
 *        the only identifier that goes outside.
 *
 * `mode: 'number'` because a JavaScript number is exact to 2^53, further than
 * any of these sequences will count.
 */
export const primaryPk = () => bigint('pk', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity();

/** A foreign key column onto another table's pk, named `<table>_pk`. */
export const refPk = (name: string) => bigint(name, { mode: 'number' });

/** The public id. Switch the default to the built-in uuidv7() on Postgres 18. */
export const publicId = () =>
  uuid('id')
    .notNull()
    .default(sql`uuid_generate_v7()`);
