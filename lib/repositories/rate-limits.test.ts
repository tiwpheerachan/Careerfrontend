import { describe, expect, it } from 'vitest';
import { testDb } from '@/tests/support/db';
import type { Database } from '@/lib/db/client';
import { createRateLimitRepository } from './rate-limits';

const repo = createRateLimitRepository(testDb as unknown as Database);
const policy = { windowMs: 60_000, limit: 3 };

describe('rate limits', () => {
  it('allows up to the limit, then refuses with a Retry-After inside the window', async () => {
    const verdicts = [];
    for (let i = 0; i < 4; i++) verdicts.push(await repo.hit('ip:203.0.113.7', policy));

    expect(verdicts.map((v) => v.allowed)).toEqual([true, true, true, false]);
    expect(verdicts[3]!.count).toBe(4);
    expect(verdicts[3]!.retryAfter).toBeGreaterThanOrEqual(1);
    expect(verdicts[3]!.retryAfter).toBeLessThanOrEqual(60);
  });

  it('counts each subject separately', async () => {
    await repo.hit('ip:203.0.113.7', policy);
    await repo.hit('ip:203.0.113.7', policy);
    const other = await repo.hit('ip:198.51.100.1', policy);
    expect(other.count).toBe(1);
  });

  it('counts concurrent requests exactly once each', async () => {
    const verdicts = await Promise.all(Array.from({ length: 10 }, () => repo.hit('user:a@example.com', policy)));
    expect(verdicts.map((v) => v.count).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(verdicts.filter((v) => v.allowed)).toHaveLength(3);
  });
});
