import { describe, expect, it } from 'vitest';
import { outcomeOf, suggestRound } from './scoring';

const ten = (n: number) => Array(10).fill(n) as number[];
const five = (n: number) => Array(5).fill(n) as number[];

describe('the interview pass mark', () => {
  it('general positions: 40 of 50 passes, 39 does not', () => {
    expect(outcomeOf({ general: ten(4), senior: null })).toMatchObject({ total: 40, max: 50, meetsPassMark: true });
    expect(outcomeOf({ general: [...ten(4).slice(1), 3], senior: null }).meetsPassMark).toBe(false);
  });

  it('Senior: the Senior items must be OVER 20 — exactly 20 fails even with a high total', () => {
    const outcome = outcomeOf({ general: ten(5), senior: five(4) }); // 50 + 20 = 70
    expect(outcome).toMatchObject({ generalTotal: 50, seniorTotal: 20, total: 70, max: 75, meetsPassMark: false });
  });

  it('Senior: 21 on the Senior items and 60 in all passes', () => {
    expect(outcomeOf({ general: ten(4).map((n, i) => (i < 9 ? n : 3)), senior: [5, 4, 4, 4, 4] }).meetsPassMark).toBe(
      true,
    ); // 39 + 21 = 60
  });

  it('Senior: over 20 on the Senior items but under 60 in all fails', () => {
    expect(outcomeOf({ general: ten(3), senior: [5, 5, 5, 5, 5] }).meetsPassMark).toBe(false); // 30 + 25 = 55
  });

  it('Senior does not need 40 on the general items on its own', () => {
    expect(outcomeOf({ general: ten(4).map((n, i) => (i < 9 ? n : 2)), senior: five(5) }).meetsPassMark).toBe(true); // 38 + 25 = 63
  });
});

describe('the suggested round', () => {
  const today = '2026-10-09';
  it('1 for a first evaluation, or another on the same day as round 1', () => {
    expect(suggestRound([], today)).toBe(1);
    expect(suggestRound([{ round: 1, interviewDate: today }], today)).toBe(1);
  });
  it('2 once round 1 was on an earlier day, or round 2 has begun', () => {
    expect(suggestRound([{ round: 1, interviewDate: '2026-10-01' }], today)).toBe(2);
    expect(suggestRound([{ round: 2, interviewDate: today }], today)).toBe(2);
  });
});
