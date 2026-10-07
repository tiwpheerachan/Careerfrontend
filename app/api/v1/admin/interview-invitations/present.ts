import { requestOrigin } from '@/lib/api/origin';
import type { Invitation } from '@/lib/repositories/interview-invitations';

/** An invitation as the API shows it: the link instead of the bare token. */
export function presentInvitation(request: Request, invitation: Invitation) {
  const { token, ...rest } = invitation;
  return { ...rest, link: `${requestOrigin(request)}/evaluate/${token}` };
}
