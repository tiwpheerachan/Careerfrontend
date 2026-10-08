import { adminGetEvaluation } from '@/lib/api/contracts';
import { handler, json, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/interview-evaluations/{id} */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id } = await parseParams(params, adminGetEvaluation.params);
  return json({ evaluation: await store().interviewEvaluations.get(id) });
});

/*
 * No PUT: an evaluation is read only in the admin. To change one, someone with
 * applications.edit makes an edit link for its evaluator (./edit-link).
 */

/** DELETE /api/v1/admin/interview-evaluations/{id} — soft delete. */
export const DELETE = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'manage' });
  const { id } = await parseParams(params, adminGetEvaluation.params);
  await store().interviewEvaluations.softDelete(id, actor.email);
  return new Response(null, { status: 204 });
});
