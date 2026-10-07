import { inviteeApplicationForm } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { renderApplicationFormPdf } from '@/lib/application-form/pdf';
import { requireInvitee } from '@/lib/auth/invitee';
import { NotFoundError } from '@/lib/errors';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/evaluate/{token}/application-form — the candidate's application
 * form, for a link made from one. Never the sensitive fields (PDPA s.26), and
 * redacted — no contact details, family or birth date: an invited evaluator
 * is not HR, and needs to judge the candidate, not reach them.
 */
export const GET = handler<RouteParams<'token'>>(async (request, _context, { params }) => {
  const { token } = await parseParams(params, inviteeApplicationForm.params);
  const { invitation } = await requireInvitee(request, token);
  if (invitation.candidate.kind !== 'form' || !invitation.candidate.id)
    throw new NotFoundError('application form', token);
  const form = await store().applicationForms.get(invitation.candidate.id);
  const pdf = await renderApplicationFormPdf({
    letterhead: form.letterhead,
    position: form.position,
    answers: form.answers,
    sensitive: null,
    redact: true,
    submittedAt: form.createdAt,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="application-form.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
});
