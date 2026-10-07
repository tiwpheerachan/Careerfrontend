import pino from 'pino';
import { isoWithOffset } from '@/lib/time';

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
  // ISO with the offset (…+07:00): comparable across systems, readable in Bangkok time.
  timestamp: () => `,"time":"${isoWithOffset()}"`,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.secret'],
    censor: '[redacted]',
  },
});

export type Logger = typeof log;
