import 'server-only';
import { getHeapStatistics } from 'node:v8';
import { log } from '@/lib/log';

const EVERY_MS = 60_000;
/** A line only when the process grew or shrank by this much: a quiet server stays quiet. */
const STEP_MB = 32;

const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

/**
 * The process's memory in the log, so an out-of-memory restart can be told
 * apart afterwards: heap (our objects), external (Buffers) or the rest of rss
 * (native libraries).
 */
export function startMemoryLog(): void {
  log.info(
    { heapLimitMb: mb(getHeapStatistics().heap_size_limit), constrainedMb: mb(process.constrainedMemory()) },
    'memory limits',
  );
  let last = 0;
  setInterval(() => {
    const now = process.memoryUsage();
    if (Math.abs(mb(now.rss) - last) < STEP_MB) return;
    last = mb(now.rss);
    log.info({ rssMb: last, heapMb: mb(now.heapUsed), externalMb: mb(now.external) }, 'memory');
  }, EVERY_MS).unref();
}
