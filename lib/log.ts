import pino from 'pino';

/**
 * The server logger: one JSON object per line, which is what Render's log
 * view and any log drain read without a parser.
 *
 * Server-only. Route handlers get a child carrying the request id (see
 * handler() in lib/api/http.ts), so every line a request writes can be found
 * by that id — the same id the response sends back in `x-request-id`.
 *
 * Personal data from applications (names, emails, phone numbers, file
 * contents) is never logged. Log ids and counts instead.
 */
export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'shd-careers' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.secret'],
    censor: '[redacted]',
  },
});

export type Logger = typeof log;
