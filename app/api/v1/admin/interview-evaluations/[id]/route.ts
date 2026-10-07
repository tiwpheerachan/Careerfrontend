import { adminGetEvaluation, adminUpdateEvaluation } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { allows } from '@/lib/auth/permissions';
import { ForbiddenError } from '@/lib/errors';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/interview-evaluations/{id} */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id } = await parseParams(params, adminGetEvaluation.params);
  return json({ evaluation: await store().interviewEvaluations.get(id) });
});

/**
 * PUT /api/v1/admin/interview-evaluations/{id} — an evaluation is its
 * evaluator's: only they change it, or someone with manage. One sent through
 * an invitation link is changed by nobody: it stays as its evaluator sent it
 * (a wrong one is deleted, and the person invited again).
 */
export const PUT = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { id } = await parseParams(params, adminUpdateEvaluation.params);
  const repo = store().interviewEvaluations;
  const current = await repo.get(id);
  if (current.viaInvitation) {
    throw new ForbiddenError(
      'This evaluation was sent through an invitation link and cannot be changed — delete it and invite the evaluator again.',
    );
  }
  const own = current.evaluator.email.toLowerCase() === actor.email.toLowerCase();
  if (!own && !allows(actor.permissions, 'applications', 'manage')) {
    throw new ForbiddenError('Only the evaluator who wrote this evaluation can change it.');
  }
  const input = await parseBody(request, adminUpdateEvaluation.body.schema);
  // Someone else's (manage): kept as an edit, with who and when.
  return json({ evaluation: await repo.update(id, input, own ? null : actor.email) });
});

/** DELETE /api/v1/admin/interview-evaluations/{id} — soft delete. */
export const DELETE = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'manage' });
  const { id } = await parseParams(params, adminGetEvaluation.params);
  await store().interviewEvaluations.softDelete(id, actor.email);
  return new Response(null, { status: 204 });
});
