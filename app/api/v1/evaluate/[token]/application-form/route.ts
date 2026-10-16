import { inviteeApplicationForm } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { photoOfForm } from '@/lib/api/application-form';
import { renderApplicationFormPdf } from '@/lib/application-form/pdf';
import { requireInvitee } from '@/lib/auth/invitee';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/evaluate/{token}/application-form — the candidate's application
 * form, for an HR link made from one. Never the sensitive fields (PDPA s.26),
 * and redacted — no contact details, family or birth date.
 *
 * Not for the hiring department (403): the form has the expected and past
 * salaries and personal details that are HR's alone (asked for 2026-10-16).
 * Their page shows the work profile, the photo and the résumé instead.
 */
export const GET = handler<RouteParams<'token'>>(async (request, _context, { params }) => {
  const { token } = await parseParams(params, inviteeApplicationForm.params);
  const { invitation } = await requireInvitee(request, token);
  if (invitation.candidate.kind !== 'form' || !invitation.candidate.id)
    throw new NotFoundError('application form', token);
  if (invitation.evaluatorRole !== 'HR') throw new ForbiddenError('The application form is for HR only.');
  const form = await store().applicationForms.get(invitation.candidate.id);
  const pdf = await renderApplicationFormPdf({
    letterhead: form.letterhead,
    position: form.position,
    answers: form.answers,
    sensitive: null,
    redact: true,
    submittedAt: form.createdAt,
    photo: await photoOfForm(form),
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="application-form.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
});
