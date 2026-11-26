import type { InterviewEvaluationRow } from '@/lib/db/schema';
import type { CandidateKind } from '@/lib/interview/candidate-key';
import { GENERAL_ITEMS, SENIOR_ITEMS } from '@/lib/interview/scoring';
import type { PastEvaluation } from '@/lib/repositories/interview-evaluations';

export type Score = number | null;

export interface FormState {
  link: { kind: CandidateKind; id: string } | null;
  candidateName: string;
  position: string;
  department: string;
  interviewDate: string;
  round: 1 | 2;
  evaluatorRole: InterviewEvaluationRow['evaluatorRole'];
  senior: boolean;
  general: Score[];
  seniorScores: Score[];
  result: InterviewEvaluationRow['result'] | '';
  failReason: string;
  comment: string;
}

/**
 * What is typed, kept in the tab (sessionStorage, never localStorage: it is
 * about a candidate) until it is sent or discarded, so a reload or a sign-in
 * in between loses nothing.
 */
export interface EvaluationDraft {
  /** Whose: another account signing in on this tab must not see it. */
  evaluator: string;
  form: FormState;
  history: PastEvaluation[];
}

export const draftStorageKey = (id: string) => `shd.evaluation.draft.v1.${id}`;

const scoresOf = (value: unknown, length: number): Score[] | undefined =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((s) => s === null || (Number.isInteger(s) && s >= 0 && s <= 5))
    ? value
    : undefined;

/**
 * A stored draft laid over the form's starting state; undefined for someone
 * else's, or an old shape. Through a link (`fixed`) the candidate, round, side
 * and Senior stay the link's.
 */
export function restoreDraft(
  raw: string,
  initial: FormState,
  evaluator: string,
  fixed: boolean,
): Pick<EvaluationDraft, 'form' | 'history'> | undefined {
  let draft: Partial<EvaluationDraft> | null;
  try {
    draft = JSON.parse(raw) as Partial<EvaluationDraft> | null;
  } catch {
    return undefined;
  }
  const saved = draft?.form;
  const general = scoresOf(saved?.general, GENERAL_ITEMS.length);
  const seniorScores = scoresOf(saved?.seniorScores, SENIOR_ITEMS.length);
  if (!draft || !saved || draft.evaluator !== evaluator || !general || !seniorScores) return undefined;
  const mine = { general, seniorScores, result: saved.result, failReason: saved.failReason, comment: saved.comment };
  return {
    form: fixed ? { ...initial, ...mine } : { ...initial, ...saved },
    history: Array.isArray(draft.history) ? draft.history : [],
  };
}
