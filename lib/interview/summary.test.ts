import { describe, expect, it } from 'vitest';
import { candidateResult, combine, summarize, verdictOf } from './summary';

const at = (minute: number) => new Date(`2026-10-07T10:${String(minute).padStart(2, '0')}:00+07:00`);
const e = (
  email: string,
  round: 1 | 2,
  evaluatorRole: 'HR' | 'DEPARTMENT',
  generalTotal: number,
  extra: Partial<{
    seniorTotal: number | null;
    meetsPassMark: boolean;
    result: 'PENDING' | 'PASS' | 'FAIL';
    minute: number;
  }> = {},
) => ({
  round,
  evaluatorRole,
  evaluator: { email },
  generalTotal,
  seniorTotal: extra.seniorTotal ?? null,
  meetsPassMark: extra.meetsPassMark ?? generalTotal >= 40,
  result: extra.result ?? 'PASS',
  updatedAt: at(extra.minute ?? 0),
});

describe('the summary per side and round', () => {
  it('averages the evaluators, HR first and round 1 first, and counts each one once', () => {
    const summary = summarize([
      e('a@x', 1, 'DEPARTMENT', 0, { result: 'FAIL' }),
      e('b@x', 1, 'DEPARTMENT', 40),
      e('c@x', 2, 'DEPARTMENT', 10, { result: 'PENDING' }),
      e('d@x', 2, 'DEPARTMENT', 50, { seniorTotal: 25, meetsPassMark: true }),
      e('hr@x', 1, 'HR', 45, { seniorTotal: 15, meetsPassMark: false, result: 'FAIL', minute: 1 }),
      // an older evaluation by the same person, same round: not counted
      e('hr@x', 1, 'HR', 10, { minute: 0 }),
    ]);
    expect(summary.map((s) => `${s.role}-${s.round}`)).toEqual(['HR-1', 'DEPARTMENT-1', 'DEPARTMENT-2']);
    expect(summary[0]).toMatchObject({ count: 1, generalAverage: 45, seniorAverage: 15, meets: 0 });
    expect(summary[1]).toMatchObject({
      count: 2,
      generalAverage: 20,
      seniorAverage: null,
      meets: 1,
      results: { PENDING: 0, PASS: 1, FAIL: 1 },
    });
    // Items 11–15 are averaged over those who scored them.
    expect(summary[2]).toMatchObject({ count: 2, generalAverage: 30, seniorAverage: 25, meets: 1 });
  });
});

describe('one side, both rounds together', () => {
  const ev = (
    id: string,
    round: 1 | 2,
    general: number,
    result: 'PENDING' | 'PASS' | 'FAIL',
    extra: Partial<{ senior: number; role: 'HR' | 'DEPARTMENT'; email: string }> = {},
  ) => {
    const generalScores = Array(10).fill(general) as number[];
    const seniorScores = extra.senior === undefined ? null : (Array(5).fill(extra.senior) as number[]);
    const generalTotal = general * 10;
    const seniorTotal = seniorScores ? extra.senior! * 5 : null;
    return {
      id,
      round,
      evaluatorRole: extra.role ?? ('DEPARTMENT' as const),
      evaluator: { email: extra.email ?? `${id}@x`, name: id },
      generalScores,
      seniorScores,
      generalTotal,
      seniorTotal,
      total: generalTotal + (seniorTotal ?? 0),
      max: seniorScores ? 75 : 50,
      meetsPassMark: false,
      result,
      viaInvitation: false,
      updatedAt: at(0),
    };
  };

  it('averages each round, then the rounds equally; votes across both rounds', () => {
    const c = combine(
      [
        ev('a', 1, 0, 'FAIL'),
        ev('b', 1, 4, 'PASS'),
        ev('c', 2, 5, 'PASS', { senior: 5 }),
        ev('hr', 1, 1, 'FAIL', { role: 'HR' }),
      ],
      'DEPARTMENT',
    )!;
    expect(c.rounds[1].map((e) => e.id)).toEqual(['a', 'b']);
    expect(c.general.round1![0]).toBe(2);
    expect(c.general.round2![0]).toBe(5);
    // (2 + 5) / 2 — round 1's two evaluators count as much as round 2's one
    expect(c.general.overall[0]).toBe(3.5);
    expect(c.general.totals).toEqual({ round1: 20, round2: 50, overall: 35 });
    expect(c.senior!.round1).toBeNull();
    expect(c.senior!.totals.overall).toBe(25);
    expect(c.votes.all).toEqual({ PENDING: 0, PASS: 2, FAIL: 1 });
    expect(c.verdict).toBe('PASS');
    expect(c.meetsPassMark).toBe(true); // 25 > 20 and 35 + 25 >= 60
  });

  it('without a side, HR and the department count together', () => {
    const c = combine([
      ev('hr', 1, 0, 'FAIL', { role: 'HR' }),
      ev('dep', 1, 4, 'PASS'),
      ev('dep2', 2, 5, 'PASS'),
      // the same person on both sides in one round: two evaluations, both counted
      ev('both-hr', 2, 2, 'FAIL', { role: 'HR', email: 'both@x' }),
      ev('both-dep', 2, 2, 'FAIL', { email: 'both@x' }),
    ])!;
    expect(c.rounds[1].map((e) => e.id)).toEqual(['hr', 'dep']);
    expect(c.rounds[2]).toHaveLength(3);
    expect(c.votes.round1).toEqual({ PENDING: 0, PASS: 1, FAIL: 1 });
    expect(c.votes.all).toEqual({ PENDING: 0, PASS: 2, FAIL: 3 });
    expect(c.verdict).toBe('FAIL');
    // (0 + 4) / 2 = 2 and (5 + 2 + 2) / 3 = 3, then (2 + 3) / 2
    expect(c.general.overall[0]).toBe(2.5);
  });

  it('the pass mark on averages that land exactly on it, despite floating point', () => {
    const senior = (id: string, round: 1 | 2, seniorScores: number[]) => ({
      ...ev(id, round, 4, 'PASS', { senior: 0 }),
      seniorScores,
    });
    // Senior items: (21 + (12 + 22 + 20) / 3) / 2 = exactly 20, which adds up to
    // 20.000000000000004 in floating point. 20 is not over 20: no pass, though
    // all fifteen total 40 + 20 = 60.
    const exactly20 = combine(
      [
        senior('a', 1, [5, 5, 4, 3, 5]),
        senior('b', 2, [4, 1, 5, 1, 1]),
        senior('c', 2, [5, 5, 3, 4, 5]),
        senior('d', 2, [5, 2, 4, 5, 4]),
      ],
      'DEPARTMENT',
    )!;
    expect(exactly20.senior!.totals.overall).toBeCloseTo(20);
    expect(exactly20.meetsPassMark).toBe(false);

    const meets = (...evaluations: ReturnType<typeof ev>[]) => combine(evaluations, 'DEPARTMENT')!.meetsPassMark;
    // General: (30 + 50) / 2 = 40 passes, (30 + 40) / 2 = 35 does not.
    expect(meets(ev('a', 1, 3, 'PASS'), ev('b', 2, 5, 'PASS'))).toBe(true);
    expect(meets(ev('a', 1, 3, 'PASS'), ev('b', 2, 4, 'PASS'))).toBe(false);
    // Senior: 35 + 25 = 60 passes; 35 + 22.5 = 57.5 does not.
    expect(meets(ev('a', 1, 4, 'PASS', { senior: 5 }), ev('b', 2, 3, 'PASS', { senior: 5 }))).toBe(true);
    expect(meets(ev('a', 1, 4, 'PASS', { senior: 5 }), ev('b', 2, 3, 'PASS', { senior: 4 }))).toBe(false);
  });

  it('a candidate’s result: the list’s row and the candidate page’s summary', () => {
    expect(candidateResult([])).toBeNull();
    // Round 1 only, one of them Senior: out of 75, round 2 not evaluated yet.
    const r = candidateResult([
      ev('a', 1, 4, 'FAIL', { role: 'HR' }),
      ev('b', 1, 5, 'PASS', { senior: 5 }),
      ev('c', 1, 3, 'FAIL'),
    ])!;
    expect(r).toMatchObject({ score: 40 + 25, max: 75, meetsPassMark: true, verdict: 'FAIL' });
    expect(r.rounds).toEqual([
      { round: 1, result: 'FAIL' },
      { round: 2, result: null },
    ]);
    // The sum shown: items 1–10 over everyone, 11–15 over who scored them.
    expect(r.formula.general).toEqual({ rounds: [{ round: 1, totals: [40, 50, 30], average: 40 }], overall: 40 });
    expect(r.formula.senior).toEqual({ rounds: [{ round: 1, totals: [25], average: 25 }], overall: 25 });
  });

  it('the formula adds up to the score: both rounds averaged, each counting the same', () => {
    const r = candidateResult([ev('a', 1, 0, 'FAIL'), ev('b', 1, 4, 'PASS'), ev('c', 2, 5, 'PASS')])!;
    expect(r.formula.general.rounds.map((x) => [x.totals, x.average])).toEqual([
      [[0, 40], 20],
      [[50], 50],
    ]);
    expect(r.formula.general.overall).toBe((20 + 50) / 2);
    expect(r.score).toBe(r.formula.general.overall);
    expect(r.formula.senior).toBeNull();
  });

  it('a tie for the most chosen is PENDING; nobody is null', () => {
    expect(verdictOf({ PENDING: 0, PASS: 1, FAIL: 1 })).toBe('PENDING');
    expect(verdictOf({ PENDING: 1, PASS: 1, FAIL: 0 })).toBe('PENDING');
    expect(verdictOf({ PENDING: 2, PASS: 1, FAIL: 0 })).toBe('PENDING');
    expect(verdictOf({ PENDING: 0, PASS: 0, FAIL: 2 })).toBe('FAIL');
    expect(verdictOf({ PENDING: 0, PASS: 0, FAIL: 0 })).toBeNull();
    expect(combine([ev('a', 1, 4, 'PASS')], 'HR')).toBeNull();
  });
});
