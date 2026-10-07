import { adminCreateInvitation, adminListInvitations } from '@/lib/api/contracts';
import { handler, json, parseBody, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { NotFoundError } from '@/lib/errors';
import { parseCandidateKey } from '@/lib/interview/candidate-key';
import { store } from '@/lib/store';
import { presentInvitation } from './present';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/interview-invitations?candidate= — one candidate's links, newest first. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { candidate } = parseQuery(request, adminListInvitations.query);
  const ref = parseCandidateKey(candidate);
  if (!ref) throw new NotFoundError('candidate', candidate);
  const invitations = await store().interviewInvitations.forCandidate(ref);
  return json({ invitations: invitations.map((i) => presentInvitation(request, i)) });
});

/** POST /api/v1/admin/interview-invitations — one link for the people chosen. */
export const POST = handler(async (request, { log }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const input = await parseBody(request, adminCreateInvitation.body.schema);
  const invitation = await store().interviewInvitations.create(input, actor.email, new Date(), actor.name || null);
  log.info(
    { invitationId: invitation.id, invitees: input.invitees.length, round: input.round },
    'interview invitation made',
  );
  return json({ invitation: presentInvitation(request, invitation) }, 201);
});
