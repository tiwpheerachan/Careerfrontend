import { adminCreateJob, adminListJobs } from '@/lib/api/contracts';
import { handler, json, parseBody, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { publicContentChanged } from '@/lib/i18n/public-content';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/jobs */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'jobs', level: 'view' });
  const query = parseQuery(request, adminListJobs.query);
  return json({ jobs: await store().jobs.list(query) });
});

/** POST /api/v1/admin/jobs */
export const POST = handler(async (request) => {
  const actor = await requireAdmin(request, { resource: 'jobs', level: 'edit' });
  const input = await parseBody(request, adminCreateJob.body.schema);
  const job = await store().jobs.create(input, actor.email);
  publicContentChanged();
  return json({ job }, 201);
});
