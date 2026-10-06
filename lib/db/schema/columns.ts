import { text, timestamp } from 'drizzle-orm/pg-core';
import { status } from './enums';

/** created_at / updated_at. updated_at is moved by the set_updated_at() trigger, never by app code. */
export const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

/**
 * The soft-delete lifecycle: `status` plus who deleted it and when.
 * A CHECK in the migration keeps deleted_at set exactly when status = 'DELETED'.
 */
export const lifecycle = () => ({
  status: status('status').notNull().default('ACTIVE'),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  deletedBy: text('deleted_by'),
});
