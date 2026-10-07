import { adminGetJob, adminUpdateJob } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/jobs/{id} */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request, { resource: 'jobs', level: 'view' });
  const { id } = await parseParams(params, adminGetJob.params);
  return json({ job: await store().jobs.get(id) });
});

/** PUT /api/v1/admin/jobs/{id} — replaces the whole job. */
export const PUT = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'jobs', level: 'edit' });
  const { id } = await parseParams(params, adminUpdateJob.params);
  const input = await parseBody(request, adminUpdateJob.body.schema);
  return json({ job: await store().jobs.update(id, input, actor.email) });
});

/** DELETE /api/v1/admin/jobs/{id} — soft delete. */
export const DELETE = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'jobs', level: 'manage' });
  const { id } = await parseParams(params, adminGetJob.params);
  await store().jobs.softDelete(id, actor.email);
  return new Response(null, { status: 204 });
});
