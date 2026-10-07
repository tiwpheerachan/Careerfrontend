import { describe, expect, it } from 'vitest';
import { outcomeOf } from './scoring';

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
