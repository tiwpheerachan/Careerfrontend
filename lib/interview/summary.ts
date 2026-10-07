import type { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';

type Role = (typeof EVALUATOR_ROLES)[number];
type Result = (typeof EVALUATION_RESULTS)[number];

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
        results: {
          PENDING: group.filter((e) => e.result === 'PENDING').length,
          PASS: group.filter((e) => e.result === 'PASS').length,
          FAIL: group.filter((e) => e.result === 'FAIL').length,
        },
      });
    }
  }
  return out;
}

/** 20, 22.5 — one decimal place at most. */
export const formatAverage = (value: number) => String(Math.round(value * 10) / 10);
