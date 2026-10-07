import { describe, expect, it } from 'vitest';
import { summarize } from './summary';

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
