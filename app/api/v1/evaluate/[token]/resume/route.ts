import { inviteeResume } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireInvitee } from '@/lib/auth/invitee';
import { NotFoundError } from '@/lib/errors';
import { fileResponse } from '@/lib/storage';
import { store } from '@/lib/store';

/**
 * GET /api/v1/evaluate/{token}/resume — the résumé/CV sent with the application
 * form the link is for, or the one HR attached to a candidate it added without
 * an application — to HR and the hiring department alike. 404 for a link made
 * from anything else, or when there is none.
 */
export const GET = handler<RouteParams<'token'>>(async (request, { log }, { params }) => {
  const { token } = await parseParams(params, inviteeResume.params);
  const { invitation, identity } = await requireInvitee(request, token);
  const { kind, id } = invitation.candidate;
  if ((kind !== 'form' && kind !== 'pending') || !id) throw new NotFoundError('résumé', token);
  const resume =
    kind === 'form' ? await store().applicationForms.resume(id) : await store().interviewCandidates.resume(id);
  log.info({ invitee: identity.email, invitationId: invitation.id }, 'application form résumé opened by an invitee');

  return fileResponse(resume, 'inline');
});
