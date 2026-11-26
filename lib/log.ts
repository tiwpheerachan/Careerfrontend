import pino from 'pino';
import { isoWithOffset } from '@/lib/time';

/**
 * A failed query carries every value it was sent in its message and stack: an
 * applicant's name, phone, religion. Only the query's text and the database's
 * code are kept.
 */
export function safeError(err: unknown): unknown {
  if (!(err instanceof Error)) return { type: typeof err };
  const query = err.message.startsWith('Failed query:');
  const { code } = err as { code?: unknown };
  return {
    type: err.name,
    message: query
      ? err.message.split('\nparams:')[0]
      : code && /^[0-9A-Z]{5}$/.test(String(code))
        ? 'database error'
        : err.message,
    ...(code === undefined ? {} : { code }),
    stack: err.stack
      ?.split('\n')
      .filter((line) => /^\s+at /.test(line))
      .join('\n'),
    ...(err.cause === undefined ? {} : { cause: safeError(err.cause) }),
  };
}

/**
 * The server logger: one JSON object per line, which is what Render's log
 * view and any log drain read without a parser. Every line carries its time
 * with an offset ("2026-10-07T09:15:02.123+07:00").
 *
 * Server-only. Route handlers get a child carrying the request id (see
 * handler() in lib/api/http.ts), so every line a request writes can be found
 * by that id — the same id the response sends back in `x-request-id`.
 *
 * Personal data from applications (names, emails, phone numbers, file
 * contents) is never logged. Log ids and counts instead.
 */
export const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'shd-careers' },
  serializers: { err: safeError },
  // ISO with the offset (…+07:00): comparable across systems, readable in Bangkok time.
  timestamp: () => `,"time":"${isoWithOffset()}"`,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.secret'],
    censor: '[redacted]',
  },
});

export type Logger = typeof log;
