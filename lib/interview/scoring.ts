/**
 * The interview evaluation form's scoring, exactly as the paper form states it
 * (data_for_new_func/Interview_Evaluation_Form — the HR, department and
 * Chinese versions agree on everything but one word, below).
 *
 * Each item is scored 0–5:
 *   0 unsatisfactory · 1 needs improvement · 2 satisfactory · 3 fair ·
 *   4 meets the standard · 5 above the standard
 *
 * Items 1–10 for everyone (out of 50); items 11–15 too for Senior positions
 * and above (out of 25).
 *
 * To pass:
 *   general  the ten items total 40 or more
 *   Senior   the five Senior items total MORE THAN 20 (21+), and all fifteen
 *            total 60 or more. The Thai form says "เกิน 20" (over 20); the
 *            Chinese one "20分以上", which can be read as 20 and up — HR chose
 *            the Thai reading (2026-10-07).
 *
 * The result is a recommendation: the evaluator still chooses pass, fail or
 * "pending / compare further" themselves, as on paper.
 *
 * Plain data, no imports: the form in the browser and the server both use it.
 */

export const SCORE_MIN = 0;
export const SCORE_MAX = 5;
export const SCORE_LEVELS = [0, 1, 2, 3, 4, 5] as const;

/** Items 1–10, in the form's order. Message keys under interviews.items. */
export const GENERAL_ITEMS = [
  'fieldKnowledge',
  'jobKnowledge',
  'tools',
  'experienceFit',
  'analysis',
  'businessKnowledge',
  'coordination',
  'adaptability',
  'workStandards',
  'attitude',
] as const;

/** Items 11–15, Senior positions and above. */
export const SENIOR_ITEMS = [
  'leadership',
  'strategicThinking',
  'planning',
  'decisionMaking',
  'teamManagement',
] as const;

export const GENERAL_PASS = 40;
/** The Senior items must total MORE than this. */
export const SENIOR_ITEMS_OVER = 20;
export const SENIOR_TOTAL_PASS = 60;

export interface Scores {
  /** Ten scores, items 1–10. */
  general: readonly number[];
  /** Five scores, items 11–15 — only for a Senior position, else null. */
  senior: readonly number[] | null;
}

export interface Outcome {
  generalTotal: number;
  /** Null when the position is not Senior. */
  seniorTotal: number | null;
  /** generalTotal + seniorTotal (or generalTotal alone). */
  total: number;
  /** Out of 50, or 75 for Senior. */
  max: number;
  /** Whether the scores meet the form's pass mark. */
  meetsPassMark: boolean;
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

/** Totals and whether they pass. Missing scores (a form half filled in) count as 0. */
export function outcomeOf(scores: Scores): Outcome {
  const generalTotal = sum(scores.general);
  if (!scores.senior) {
    return {
      generalTotal,
      seniorTotal: null,
      total: generalTotal,
      max: 50,
      meetsPassMark: generalTotal >= GENERAL_PASS,
    };
  }
  const seniorTotal = sum(scores.senior);
  const total = generalTotal + seniorTotal;
  return {
    generalTotal,
    seniorTotal,
    total,
    max: 75,
    meetsPassMark: seniorTotal > SENIOR_ITEMS_OVER && total >= SENIOR_TOTAL_PASS,
  };
}
