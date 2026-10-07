import { inviteeSubmit } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { requireInvitee } from '@/lib/auth/invitee';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/evaluate/{token} — an invited evaluator's evaluation. Once per
 * person: their part of the link closes as it is saved.
 */
export const POST = handler<RouteParams<'token'>>(async (request, { log }, { params }) => {
  const { token } = await parseParams(params, inviteeSubmit.params);
  const { identity, invitation } = await requireInvitee(request, token);
  const input = await parseBody(request, inviteeSubmit.body.schema);
  const saved = await store().interviewInvitations.submit(token, identity, input);
  log.info({ invitationId: invitation.id, evaluationId: saved.evaluationId }, 'invited evaluation sent');
  return json(saved, 201);
});
