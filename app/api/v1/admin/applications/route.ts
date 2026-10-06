import { adminListApplications } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/applications — one page, newest first. */
export const GET = handler(async (request) => {
  await requireAdmin(request);
  const query = parseQuery(request, adminListApplications.query);
  const { rows, total, stageCounts } = await store().applications.list(query);
  return json({ applications: rows, total, page: query.page, pageSize: query.pageSize, stageCounts });
});
