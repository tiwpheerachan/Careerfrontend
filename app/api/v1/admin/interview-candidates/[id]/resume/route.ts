import { adminInterviewCandidateResume } from '@/lib/api/contracts';
import { handler, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { fileResponse } from '@/lib/storage';
import { store } from '@/lib/store';

/** GET /api/v1/admin/interview-candidates/{id}/resume — the résumé HR attached to a candidate it added. Audited. */
export const GET = handler<RouteParams<'id'>>(async (request, _context, { params }) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { id } = await parseParams(params, adminInterviewCandidateResume.params);
  const resume = await store().interviewCandidates.resume(id);
  return fileResponse(resume, 'attachment');
});
