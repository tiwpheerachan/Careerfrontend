import 'server-only';
import type { InterviewEvaluation } from '@/lib/repositories/interview-evaluations';
import { store } from '@/lib/store';

/**
 * An evaluation with its linked applicant's (or application form's) current
 * name, position and department — as the candidate page, the list and the PDF
 * show them. The evaluation keeps the copy made when it was saved; an
 * applicant renamed since would otherwise read differently here.
 */
export async function withCurrentCandidate(evaluation: InterviewEvaluation): Promise<InterviewEvaluation> {
  const { candidate } = evaluation;
  if (candidate.kind === 'manual' || !candidate.id) return evaluation;
  const linked = await store().interviewEvaluations.candidate(candidate.kind, candidate.id);
  return linked
    ? {
        ...evaluation,
        candidate: { ...candidate, name: linked.name, position: linked.position, department: linked.department },
      }
    : evaluation;
}
