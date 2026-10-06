import createMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

/**
 * Runs before the public pages render: picks the language and keeps it in the
 * url (/ → /th, /jobs → /en/jobs for an English browser).
 *
 * Named proxy.ts because that is what Next 16 calls this file — middleware.ts
 * is deprecated. The admin's sign-in gate (SSO, as in shd_onelink) joins this
 * file when the admin moves in.
 *
 * Not matched: /api (JSON, no language), Next's own files, and anything with a
 * file extension (images, videos, robots.txt).
 */
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
