import { adminGetApplication } from '@/lib/api/contracts';
import { handler, json, parseParams, type RouteParams } from '@/lib/api/http';
import { presentApplication } from '@/lib/api/present';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/applications/{id} */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request);
  const { id } = await parseParams(params, adminGetApplication.params);
  return json({ application: presentApplication(await store().applications.get(id)) });
});

/** DELETE /api/v1/admin/applications/{id} — soft delete. */
export const DELETE = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request);
  const { id } = await parseParams(params, adminGetApplication.params);
  await store().applications.softDelete(id, actor.email);
  return new Response(null, { status: 204 });
});
