import { adminSearchCandidates } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/interview-candidates?q= — applicants and application forms to pick the candidate from. */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { q } = parseQuery(request, adminSearchCandidates.query);
  return json({ candidates: await store().interviewEvaluations.candidates(q) });
});
