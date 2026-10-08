import type { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';
import { outcomeOf } from './scoring';

export type Role = (typeof EVALUATOR_ROLES)[number];
export type Result = (typeof EVALUATION_RESULTS)[number];

/** What a summary needs of an evaluation. */
export interface Scored {
  round: 1 | 2;
  evaluator: { email: string };
  generalTotal: number;
  seniorTotal: number | null;
  meetsPassMark: boolean;
  result: Result;
  updatedAt: Date;
}

/**
 * Each evaluator's newest evaluation of each round — the ones that count.
 * (An evaluator who evaluated a round twice, before that was refused, is
 * counted once.) The paper form's PDF and the candidate page both use this,
 * so their averages agree.
 */
export function newestPerEvaluator<T extends Scored>(evaluations: T[]): T[] {
  const newest = new Map<string, T>();
  for (const e of [...evaluations].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())) {
    newest.set(`${e.evaluator.email.toLowerCase()}|${e.round}`, e);
  }
  return [...newest.values()];
}

export interface RoundSummary {
  role: Role;
  round: 1 | 2;
  /** How many evaluators. */
  count: number;
  /** Items 1–10, out of 50. */
  generalAverage: number;
  /** Items 11–15, out of 25 — over those who scored them; null when nobody did. */
  seniorAverage: number | null;
  /** How many met the pass mark. */
  meets: number;
  /** How many chose each result. */
  results: Record<Result, number>;
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/** How many chose each result. */
function votesOf(group: Scored[]): Record<Result, number> {
  return {
    PENDING: group.filter((e) => e.result === 'PENDING').length,
    PASS: group.filter((e) => e.result === 'PASS').length,
    FAIL: group.filter((e) => e.result === 'FAIL').length,
  };
}

/** One summary per side and round that has evaluations: HR first, round 1 first. */
export function summarize<T extends Scored & { evaluatorRole: Role }>(evaluations: T[]): RoundSummary[] {
  const out: RoundSummary[] = [];
  for (const role of ['HR', 'DEPARTMENT'] as const) {
    for (const round of [1, 2] as const) {
      const group = newestPerEvaluator(evaluations.filter((e) => e.evaluatorRole === role && e.round === round));
      if (!group.length) continue;
      const senior = group.flatMap((e) => (e.seniorTotal === null ? [] : [e.seniorTotal]));
      out.push({
        role,
        round,
        count: group.length,
        generalAverage: average(group.map((e) => e.generalTotal)),
        seniorAverage: senior.length ? average(senior) : null,
        meets: group.filter((e) => e.meetsPassMark).length,
        results: votesOf(group),
      });
    }
  }
  return out;
}

/** 20, 22.5 — one decimal place at most. */
export const formatAverage = (value: number) => String(Math.round(value * 10) / 10);

// --- One side's (or both sides') interview, both rounds together ---------------------------------------------

/** What combining needs of an evaluation, beyond a summary's. */
export interface Combinable extends Scored {
  id: string;
  evaluatorRole: Role;
  evaluator: { email: string; name: string | null };
  generalScores: number[];
  seniorScores: number[] | null;
  total: number;
  max: number;
  viaInvitation: boolean;
}

/** Each item's average in round 1, round 2, and the two together (null: nobody scored it there). */
export interface ItemAverages {
  round1: number[] | null;
  round2: number[] | null;
  /** The rounds' averages averaged — each round counts the same, however many evaluated it. */
  overall: number[];
  totals: { round1: number | null; round2: number | null; overall: number };
}

export type Votes = Record<Result, number>;

export interface Combined {
  rounds: Record<1 | 2, Combinable[]>;
  general: ItemAverages;
  /** Items 11–15, over those who scored them; null when nobody did. */
  senior: ItemAverages | null;
  votes: { round1: Votes; round2: Votes; all: Votes };
  /**
   * The result most evaluators chose, across both rounds — a tie for the most
   * is PENDING (รอพิจารณา). Null with nobody.
   */
  verdict: Result | null;
  /** The pass mark (lib/interview/scoring.ts), on the overall averages. */
  meetsPassMark: boolean;
}

const RESULTS = ['PENDING', 'PASS', 'FAIL'] as const;

/** The most chosen; a tie for the most is PENDING; nothing chosen is null. */
export function verdictOf(votes: Votes): Result | null {
  const most = Math.max(...RESULTS.map((r) => votes[r]));
  if (most === 0) return null;
  const leaders = RESULTS.filter((r) => votes[r] === most);
  return leaders.length === 1 ? leaders[0]! : 'PENDING';
}

/** Per item, over the score lists given; null when there are none. */
function itemAverages(lists: number[][]): number[] | null {
  if (!lists.length) return null;
  return lists[0]!.map((_, i) => average(lists.map((scores) => scores[i]!)));
}

function averagesOf(round1: number[][], round2: number[][]): ItemAverages | null {
  const r1 = itemAverages(round1);
  const r2 = itemAverages(round2);
  const overall = itemAverages([r1, r2].filter((r): r is number[] => r !== null));
  if (!overall) return null;
  const total = (items: number[] | null) => (items ? items.reduce((a, b) => a + b, 0) : null);
  return {
    round1: r1,
    round2: r2,
    overall,
    totals: { round1: total(r1), round2: total(r2), overall: total(overall)! },
  };
}

/**
 * One side's (HR's, or the department's) evaluations of a candidate, both
 * rounds together — or, without `role`, both sides' together (the admin list).
 * Each evaluator's newest per round and side counts.
 */
export function combine<T extends Combinable>(evaluations: T[], role?: Role): Combined | null {
  const sides = role ? [role] : (['HR', 'DEPARTMENT'] as const);
  return combineRounds(
    sides.flatMap((side) => newestPerEvaluator(evaluations.filter((e) => e.evaluatorRole === side))),
  );
}

/**
 * Evaluations already chosen (at most one per evaluator and round), both
 * rounds together — a side's, or one evaluator's own round 1 and round 2.
 */
export function combineRounds<T extends Combinable>(kept: T[]): Combined | null {
  if (!kept.length) return null;
  const rounds = { 1: kept.filter((e) => e.round === 1), 2: kept.filter((e) => e.round === 2) };
  const general = averagesOf(
    rounds[1].map((e) => e.generalScores),
    rounds[2].map((e) => e.generalScores),
  )!;
  const senior = averagesOf(
    rounds[1].flatMap((e) => (e.seniorScores ? [e.seniorScores] : [])),
    rounds[2].flatMap((e) => (e.seniorScores ? [e.seniorScores] : [])),
  );
  const all = votesOf(kept);
  const { meetsPassMark } = outcomeOf({ general: general.overall, senior: senior?.overall ?? null });
  return {
    rounds,
    general,
    senior,
    votes: { round1: votesOf(rounds[1]), round2: votesOf(rounds[2]), all },
    verdict: verdictOf(all),
    meetsPassMark,
  };
}

/** A candidate's result, both sides and both rounds together. */
export interface CandidateResult {
  /** The average score over both rounds: items 1–10, plus 11–15 when scored. */
  score: number;
  /** 50, or 75 when anyone scored items 11–15. */
  max: number;
  meetsPassMark: boolean;
  /** The result chosen most; a tie is PENDING. */
  verdict: Result;
  /** Each round's own result, the same way; null when nobody evaluated it. */
  rounds: Array<{ round: 1 | 2; result: Result | null }>;
  /** How `score` comes about, to show the sum: items 1–10, and 11–15 when anyone scored them. */
  formula: { general: ScorePart; senior: ScorePart | null };
}

/**
 * One part of the score: each round's evaluator totals and their average,
 * then the rounds' averages averaged (each round counts the same). The same
 * numbers combine() works with — summing per-item averages is averaging totals.
 */
export interface ScorePart {
  rounds: Array<{ round: 1 | 2; totals: number[]; average: number }>;
  overall: number;
}

/**
 * One candidate's result — the admin list's row and the candidate page's
 * summary, so the two never disagree. Null with no evaluations.
 */
export function candidateResult<T extends Combinable>(evaluations: T[]): CandidateResult | null {
  const combined = combine(evaluations);
  if (!combined) return null;
  return {
    score: combined.general.totals.overall + (combined.senior?.totals.overall ?? 0),
    max: Math.max(...evaluations.map((e) => e.max)),
    meetsPassMark: combined.meetsPassMark,
    verdict: combined.verdict!,
    rounds: ([1, 2] as const).map((round) => ({ round, result: verdictOf(combined.votes[`round${round}`]) })),
    formula: {
      general: partOf(combined.rounds, (e) => e.generalTotal, combined.general.totals.overall),
      senior: combined.senior ? partOf(combined.rounds, (e) => e.seniorTotal, combined.senior.totals.overall) : null,
    },
  };
}

function partOf(rounds: Combined['rounds'], total: (e: Combinable) => number | null, overall: number): ScorePart {
  return {
    rounds: ([1, 2] as const).flatMap((round) => {
      const totals = rounds[round].flatMap((e) => (total(e) === null ? [] : [total(e)!]));
      return totals.length ? [{ round, totals, average: average(totals) }] : [];
    }),
    overall,
  };
}
