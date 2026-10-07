import { adminCreateEvaluation, adminListEvaluations } from '@/lib/api/contracts';
import { handler, json, parseBody, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/interview-evaluations — one page, newest interview first. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const query = parseQuery(request, adminListEvaluations.query);
  const { items, total } = await store().interviewEvaluations.list(query);
  return json({ evaluations: items, total, page: query.page, pageSize: query.pageSize });
});

/** POST /api/v1/admin/interview-evaluations — the signed-in admin's evaluation of one round. */
export const POST = handler(async (request) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const input = await parseBody(request, adminCreateEvaluation.body.schema);
  const evaluation = await store().interviewEvaluations.create(input, {
    email: actor.email,
    name: actor.name || null,
  });
  return json({ evaluation }, 201);
});
