import { adminRevokeInvitation } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

/** DELETE /api/v1/admin/interview-invitations/{id} — switch the link off. */
export const DELETE = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { id } = await parseParams(params, adminRevokeInvitation.params);
  await store().interviewInvitations.revoke(id, actor.email);
  return new Response(null, { status: 204 });
});
