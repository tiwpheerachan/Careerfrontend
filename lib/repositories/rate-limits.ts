import { sql } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import { rateLimits } from '@/lib/db/schema';

/**
 * A fixed-window counter, one row per caller, moved by a single statement.
 *
 * Mechanism only: who a subject is, the window and the limit are decided by
 * whoever calls this. Same statement as shd_onelink.
 */

export interface RateLimitPolicy {
  /** The window, in milliseconds. */
  windowMs: number;
  /** How many requests one subject may make inside it. */
  limit: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  /** Requests so far in this window, this one included. */
  count: number;
  /** Seconds until the window turns over — the Retry-After of a 429. */
  retryAfter: number;
}

export function createRateLimitRepository(db: Database) {
  return {
    /**
     * Counts one request against `subject` and says whether it fits.
     *
     * The window start comes from the database's clock (date_bin rounds now()
     * down to a window boundary), so every instance agrees on it. ON CONFLICT
     * either increments, if the stored window is the current one, or starts
     * over at 1 — read, compare and write inside one row lock.
     *
     * A refused request still moves the counter, so hammering a closed window
     * cannot hold the count just under the line.
     */
    async hit(subject: string, policy: RateLimitPolicy): Promise<RateLimitVerdict> {
      const seconds = policy.windowMs / 1000;
      const windowStart = sql`date_bin(make_interval(secs => ${seconds}), now(), timestamptz 'epoch')`;

      const rows = await db
        .insert(rateLimits)
        .values({ subject, windowStart, count: 1 })
        .onConflictDoUpdate({
          target: rateLimits.subject,
          set: {
            count: sql`case
              when ${rateLimits.windowStart} = excluded.window_start then ${rateLimits.count} + 1
              else 1
            end`,
            windowStart: sql`excluded.window_start`,
          },
        })
        .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

      const row = rows[0]!;
      const resetAt = row.windowStart.getTime() + policy.windowMs;
      return {
        allowed: row.count <= policy.limit,
        count: row.count,
        retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
      };
    },
  };
}

export type RateLimitRepository = ReturnType<typeof createRateLimitRepository>;
