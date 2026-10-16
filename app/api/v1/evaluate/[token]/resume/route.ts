import { inviteeResume } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireInvitee } from '@/lib/auth/invitee';
import { NotFoundError } from '@/lib/errors';
import { objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/**
 * GET /api/v1/evaluate/{token}/resume — the résumé/CV sent with the application
 * form the link is for, to HR and the hiring department alike. 404 for a link
 * made from anything else, or a form sent without one.
 */
export const GET = handler<RouteParams<'token'>>(async (request, { log }, { params }) => {
  const { token } = await parseParams(params, inviteeResume.params);
  const { invitation, identity } = await requireInvitee(request, token);
  if (invitation.candidate.kind !== 'form' || !invitation.candidate.id) throw new NotFoundError('résumé', token);
  const resume = await store().applicationForms.resume(invitation.candidate.id);
  log.info({ invitee: identity.email, invitationId: invitation.id }, 'application form résumé opened by an invitee');

  const opened = await objectStore().open(resume.path, resume.name);
  if ('redirect' in opened) {
    return new Response(null, { status: 302, headers: { location: opened.redirect, 'cache-control': 'no-store' } });
  }
  return new Response(opened.bytes as BodyInit, {
    headers: {
      'content-type': resume.type,
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(resume.name)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
