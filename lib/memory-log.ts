import 'server-only';
import { getHeapStatistics } from 'node:v8';
import { inFlight } from '@/lib/api/in-flight';
import { log } from '@/lib/log';

const EVERY_MS = 5_000;
/** A line only when the process grew or shrank by this much: a quiet server stays quiet. */
const STEP_MB = 32;
/** Of the instance's 512: worth a warning, at most once a minute. */
const HIGH_MB = 400;

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
  let warned = 0;
  setInterval(() => {
    const now = process.memoryUsage();
    const rssMb = mb(now.rss);
    const high = rssMb > HIGH_MB && Date.now() - warned > 60_000;
    if (!high && Math.abs(rssMb - last) < STEP_MB) return;
    last = rssMb;
    if (high) warned = Date.now();
    log[high ? 'warn' : 'info'](
      { rssMb, heapMb: mb(now.heapUsed), externalMb: mb(now.external), inFlight: inFlight() },
      high ? 'memory high' : 'memory',
    );
  }, EVERY_MS).unref();
}
