import { presentInvitation } from '@/app/api/v1/admin/interview-invitations/present';
import { adminCreateEditLink } from '@/lib/api/contracts';
import { handler, json, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/interview-evaluations/{id}/edit-link — a link for the
 * evaluation's evaluator to change it (lib/repositories/interview-invitations.ts
 * createEditLink): the only way an evaluation changes.
 */
export const POST = handler<RouteParams<'id'>>(async (request, { log }, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { id } = await parseParams(params, adminCreateEditLink.params);
  const invitation = await store().interviewInvitations.createEditLink(id, actor.email, new Date(), actor.name || null);
  log.info({ invitationId: invitation.id, evaluationId: id }, 'interview edit link made');
  return json({ invitation: presentInvitation(request, invitation) }, 201);
});
