import { adminListApplicationForms } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/application-forms — one page, newest first. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const query = parseQuery(request, adminListApplicationForms.query);
  const { items, total } = await store().applicationForms.list(query);
  return json({ forms: items, total, page: query.page, pageSize: query.pageSize });
});
