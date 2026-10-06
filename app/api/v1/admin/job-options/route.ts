import { handler, json } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/job-options — countries, departments and levels in use, for autocomplete. */
export const GET = handler(async (request) => {
  await requireAdmin(request);
  return json(await store().jobs.options());
});
