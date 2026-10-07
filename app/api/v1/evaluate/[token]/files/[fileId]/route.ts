import { inviteeFile } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireInvitee } from '@/lib/auth/invitee';
import { NotFoundError } from '@/lib/errors';
import { objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/** GET /api/v1/evaluate/{token}/files/{fileId} — a file of the applicant the link is for, and no other. */
export const GET = handler<RouteParams<'token' | 'fileId'>>(async (request, { log }, { params }) => {
  const { token, fileId } = await parseParams(params, inviteeFile.params);
  const { invitation, identity } = await requireInvitee(request, token);
  if (invitation.candidate.kind !== 'application' || !invitation.candidate.id) throw new NotFoundError('file', fileId);
  const file = await store().applications.file(invitation.candidate.id, fileId);
  log.info({ invitee: identity.email, invitationId: invitation.id, fileId }, 'application file opened by an invitee');

  const opened = await objectStore().open(file.storagePath, file.fileName);
  if ('redirect' in opened) {
    return new Response(null, { status: 302, headers: { location: opened.redirect, 'cache-control': 'no-store' } });
  }
  return new Response(opened.bytes as BodyInit, {
    headers: {
      'content-type': file.contentType,
      'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
