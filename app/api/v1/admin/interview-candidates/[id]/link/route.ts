import { adminLinkInterviewCandidate } from '@/lib/api/contracts';
import { handler, json, parseBody, parseParams, type RouteParams } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { candidateKey } from '@/lib/interview/candidate-key';
import { store } from '@/lib/store';

/**
 * POST /api/v1/admin/interview-candidates/{id}/link — the candidate's
 * application or form now exists: every evaluation and invitation of theirs
 * becomes its. Once only; 409 when someone evaluated the same round of both.
 */
export const POST = handler<RouteParams<'id'>>(async (request, { log }, { params }) => {
  const actor = await requireAdmin(request, { resource: 'applications', level: 'edit' });
  const { id } = await parseParams(params, adminLinkInterviewCandidate.params);
  const target = await parseBody(request, adminLinkInterviewCandidate.body.schema);
  const linked = await store().interviewCandidates.link(id, target, actor.email);
  log.info({ interviewCandidateId: id, linkedTo: linked }, 'interview candidate linked');
  return json({ ...linked, key: candidateKey({ ...linked, name: '' }) });
});
