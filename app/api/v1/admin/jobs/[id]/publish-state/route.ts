import { adminSetPublishState } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

/** PATCH /api/v1/admin/jobs/{id}/publish-state */
export const PATCH = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'jobs', level: 'edit' });
  const { id } = await parseParams(params, adminSetPublishState.params);
  const { publishState } = await parseBody(request, adminSetPublishState.body.schema);
  return json({ job: await store().jobs.setPublishState(id, publishState, actor.email) });
});
