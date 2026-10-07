import { adminAnalytics } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/analytics — the dashboard. Days are Bangkok days. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { days } = parseQuery(request, adminAnalytics.query);
  return json(await store().applications.analytics({ days, timeZone: 'Asia/Bangkok' }));
});
