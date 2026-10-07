import { adminDeleteApplicationForm } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

/** DELETE /api/v1/admin/application-forms/{id} — soft delete. */
export const DELETE = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'manage' });
  const { id } = await parseParams(params, adminDeleteApplicationForm.params);
  await store().applicationForms.softDelete(id, actor.email);
  return new Response(null, { status: 204 });
});
