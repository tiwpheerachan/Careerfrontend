import { adminSearchCandidates } from '@/lib/api/contracts';
import { createInterviewCandidate } from '@/lib/api/interview-candidates';
import { handler, json, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/interview-candidates?q= — applicants, application forms and added candidates to pick from. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { q } = parseQuery(request, adminSearchCandidates.query);
  return json({ candidates: await store().interviewEvaluations.candidates(q) });
});

/**
 * POST /api/v1/admin/interview-candidates — a candidate who has no application
 * yet (name, position, department, phone, optional résumé), to invite and
 * evaluate now and link to their application or form later.
 */
export const POST = handler(async (request, { log }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const created = await createInterviewCandidate(request, actor);
  log.info({ interviewCandidateId: created.id }, 'interview candidate added');
  return json(created, 201);
});
