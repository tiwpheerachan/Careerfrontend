import { integer, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { primaryPk, publicId } from './ids';

/**
 * How many requests each caller has made in the current window.
 *
 * One row per SUBJECT (`ip:<address>` for the public application form,
 * `user:<email>` for a signed-in admin), overwritten in place when its window
 * turns over. The count is moved by a single UPSERT that also decides whether
 * the window has expired, so two requests landing together cannot both read
 * 4 and both write 5. See lib/repositories/rate-limits.ts.
 */
export const rateLimits = pgTable(
  'rate_limits',
  {
    pk: primaryPk(),
    id: publicId(),
    subject: text('subject').notNull(),
    /** The start of the window the count belongs to, aligned to the window size. */
    windowStart: timestamp('window_start', { withTimezone: true, mode: 'date' }).notNull(),
    count: integer('count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('rate_limits_id_idx').on(table.id), uniqueIndex('rate_limits_subject_idx').on(table.subject)],
);

export type RateLimitRow = typeof rateLimits.$inferSelect;
