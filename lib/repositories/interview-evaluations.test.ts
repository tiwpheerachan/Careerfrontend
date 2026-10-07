import { describe, expect, it } from 'vitest';
import { interviewEvaluations } from '@/lib/db/schema';
import { testDb } from '@/tests/support/db';

/**
 * The CHECKs in migration 0006 are the last line: whatever writes to the
 * table, scores stay 0–5 in arrays of the right length, Senior scores exist
 * exactly for Senior positions, and the stored totals match the scores.
 */
const row = (overrides: Partial<typeof interviewEvaluations.$inferInsert> = {}) => ({
  candidateName: 'A',
  interviewDate: '2026-10-07',
  round: 1,
  evaluatorRole: 'HR' as const,
  evaluatorEmail: 'hr@shd',
  senior: false,
  generalScores: Array(10).fill(4),
  seniorScores: null,
  generalTotal: 40,
  seniorTotal: null,
  result: 'PASS' as const,
  ...overrides,
});

const insert = (overrides: Parameters<typeof row>[0]) => testDb.insert(interviewEvaluations).values(row(overrides));

describe('interview_evaluations CHECKs', () => {
  it('accepts a consistent row', async () => {
    await expect(insert({})).resolves.toBeDefined();
    await expect(insert({ senior: true, seniorScores: [5, 5, 5, 5, 1], seniorTotal: 21 })).resolves.toBeDefined();
  });

  it.each([
    ['a total that does not match', { generalTotal: 41 }],
    ['nine scores', { generalScores: Array(9).fill(4), generalTotal: 36 }],
    ['a score of 6', { generalScores: [...Array(9).fill(4), 6], generalTotal: 42 }],
    ['Senior scores on a non-Senior position', { seniorScores: [1, 1, 1, 1, 1], seniorTotal: 5 }],
    ['a Senior position without them', { senior: true }],
    ['round 3', { round: 3 }],
  ])('refuses %s', async (_label, overrides) => {
    await expect(insert(overrides)).rejects.toThrow();
  });
});
