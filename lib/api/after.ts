import { after } from 'next/server';

/**
 * Work for after the response has gone: next/server's `after` inside a
 * request. Outside one (a script, a test) there is no response to wait for,
 * and `after` throws — so the work just runs, unawaited. It must handle its
 * own errors either way.
 */
export function afterResponse(work: () => Promise<void>): void {
  try {
    after(work);
  } catch {
    void work();
  }
}
