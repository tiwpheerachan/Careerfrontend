/**
 * ISO 8601 in the process's own zone, WITH its offset:
 * "2026-10-07T09:15:02.123+07:00".
 *
 * For logs and for showing clocks: always an offset (never a bare local time),
 * so lines from different systems compare exactly, and in the company's zone
 * (Asia/Bangkok, the TZ every process runs with) so people read it as is.
 * Dependency-free on purpose: lib/log.ts uses it.
 */
export function isoWithOffset(date: Date = new Date()): string {
  const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}
