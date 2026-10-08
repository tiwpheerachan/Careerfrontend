import type { Database } from '@/lib/db/client';
import { adminAuditLogs } from '@/lib/db/schema';

export type AdminAuditEntry = Omit<typeof adminAuditLogs.$inferInsert, 'pk' | 'createdAt'>;

/** The admin audit trail — append only (lib/api/audit.ts writes it; nothing reads it in the app). */
export function createAdminAuditLogRepository(db: Database) {
  return {
    async record(entry: AdminAuditEntry): Promise<void> {
      await db.insert(adminAuditLogs).values(entry);
    },
  };
}
