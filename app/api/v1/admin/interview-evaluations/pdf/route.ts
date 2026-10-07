import { adminEvaluationPdf } from '@/lib/api/contracts';
import { handler, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { NotFoundError } from '@/lib/errors';
import { parseCandidateKey } from '@/lib/interview/candidate-key';
import { renderInterviewPdf } from '@/lib/interview/pdf';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/interview-evaluations/pdf?candidate=&role=&lang= — one
 * candidate's paper form for one side, the two rounds side by side.
 */
export const GET = handler(async (request, { log }) => {
  await requireAdmin(request, { resource: 'applications', level: 'view' });
  const { candidate, role, lang } = parseQuery(request, adminEvaluationPdf.query);
  const ref = parseCandidateKey(candidate);
  if (!ref) throw new NotFoundError('candidate', candidate);

  // Round 1 first, newest first within a round: the first of each round is the one printed.
  const mine = (await store().interviewEvaluations.forCandidate(ref)).filter((e) => e.evaluatorRole === role);
  if (!mine.length) throw new NotFoundError('evaluation', `${candidate} (${role})`);
  const rounds = { 1: mine.find((e) => e.round === 1), 2: mine.find((e) => e.round === 2) };
  const latest = [...mine].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]!;

  const pdf = await renderInterviewPdf({
    language: lang,
    role,
    candidate: latest.candidate,
    rounds,
    printedAt: new Date(),
  });
  log.info({ candidate: ref.kind, role, lang }, 'interview evaluation PDF');

  const name = `ประเมินสัมภาษณ์-${latest.candidate.name}.pdf`.replace(/[\\/:*?"<>|]/g, '');
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="interview-evaluation.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
    },
  });
});
