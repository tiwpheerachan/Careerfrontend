import { index, jsonb, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';
import { primaryPk } from './ids';

/**
 * The admin's audit trail — migration 0010, written by lib/api/audit.ts: who
 * created, changed or deleted what, and who took personal data out (a resume,
 * a PDF, the CSV export). One row per admin API call; append only, never shown
 * in the app.
 */
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    pk: primaryPk(),
    actorEmail: text('actor_email').notNull(),
    actorName: text('actor_name'),
    /** create · update · delete · download */
    action: text('action').notNull(),
    method: text('method').notNull(),
    /** The API path with its query: /api/v1/admin/jobs/<id>, …/pdf?candidate=… */
    path: text('path').notNull(),
    /** The path's first segment after /api/v1/admin/: jobs, applications, interview-evaluations, … */
    resource: text('resource').notNull(),
    /** The first id in the path, when there is one. */
    targetId: text('target_id'),
    /** The response status: a refused or failed attempt is kept too. */
    status: smallint('status').notNull(),
    /** What was sent (JSON bodies only, up to 16 KB); null for files and downloads. */
    body: jsonb('body'),
    ip: text('ip'),
    requestId: text('request_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('admin_audit_logs_created_idx').on(table.createdAt.desc()),
    index('admin_audit_logs_actor_idx').on(table.actorEmail, table.createdAt.desc()),
    index('admin_audit_logs_target_idx').on(table.resource, table.targetId),
  ],
);
