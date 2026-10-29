import { inviteeFile } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireInvitee } from '@/lib/auth/invitee';
import { NotFoundError } from '@/lib/errors';
import { fileResponse } from '@/lib/storage';
import { store } from '@/lib/store';

/** GET /api/v1/evaluate/{token}/files/{fileId} — a file of the applicant the link is for, and no other. */
export const GET = handler<RouteParams<'token' | 'fileId'>>(async (request, { log }, { params }) => {
  const { token, fileId } = await parseParams(params, inviteeFile.params);
  const { invitation, identity } = await requireInvitee(request, token);
  if (invitation.candidate.kind !== 'application' || !invitation.candidate.id) throw new NotFoundError('file', fileId);
  const file = await store().applications.file(invitation.candidate.id, fileId);
  log.info({ invitee: identity.email, invitationId: invitation.id, fileId }, 'application file opened by an invitee');

  return fileResponse({ path: file.storagePath, name: file.fileName, type: file.contentType }, 'inline');
});
