import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/lib/api/origin';
import { SESSION_COOKIE, unseal } from '@/lib/auth/session';
import { credentials } from '@/lib/auth/sso';
import { ADMIN_AREA_HEADER, ADMIN_PATH_HEADER } from '@/lib/i18n/admin';
import { routing } from '@/lib/i18n/routing';

const intl = createMiddleware(routing);

/**
 * Runs before pages render.
 *
 * Public pages: picks the language and keeps it in the url
 * (/ → /th, /jobs → /en/jobs for an English browser).
 *
 * /admin: no url language (it is a cookie — lib/i18n/admin.ts). The request is
 * only marked as the admin's, so lib/i18n/request.ts loads the admin's
 * messages; anything else without a language in its url (a 404 for
 * /favicon.ico) gets the public site's.
 *
 * /admin is also the sign-in gate (SSO, as in shd_onelink): without a valid
 * session cookie the browser goes to /sso/login and comes back to the page it
 * asked for. Only "is this a valid signature from us" is checked here — what
 * the person may do is asked of the central system by each page
 * (requireAdminPage) and each API route (requireAdmin).
 *
 * /sso (the sign-in's own pages: failed, signed out): no url language either;
 * the admin's messages.
 *
 * Named proxy.ts because that is what Next 16 calls this file — middleware.ts
 * is deprecated.
 *
 * Not matched: /api (JSON, no language), Next's own files, and anything with
 * a file extension (images, videos, robots.txt).
 */
/**
 * The admin in production with SSO not configured: closed, answered here so no
 * admin page runs at all. (A layout showing "not available" is not enough:
 * Next renders the page beside its layout and streams the page's data into
 * the HTML regardless.) A missing variable never opens an internal tool.
 */
const ADMIN_CLOSED = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SHDcareers · Admin</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f9fafb;font-family:ui-sans-serif,system-ui,sans-serif;color:#111827">
<main style="max-width:28rem;margin:1.5rem;padding:2rem;background:#fff;border:1px solid #e5e7eb;border-radius:1rem;text-align:center">
<h1 style="margin:0;font-size:1.25rem;font-weight:900">ระบบหลังบ้านยังไม่เปิดใช้งาน</h1>
<p style="margin:.5rem 0 0;font-size:.875rem;color:#6b7280">ต้องตั้งค่าการเข้าสู่ระบบ (SSO) ก่อน · The admin opens once sign-in (SSO) is set up.</p>
</main></body></html>`;

const isUnder = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

/** On to the page, marked as the admin's (messages) and carrying its own path (where to come back to). */
function asAdmin(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(ADMIN_AREA_HEADER, '1');
  headers.set(ADMIN_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isUnder(pathname, '/sso')) return asAdmin(request);

  // An interview invitation link: signed in with SSO, any account — whether
  // that account is on the link is the page's question (lib/auth/invitee.ts),
  // not a role. Without SSO configured the page answers for itself.
  if (isUnder(pathname, '/evaluate')) {
    const config = credentials();
    if (config && !(await unseal(request.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret))) {
      const login = new URL('/sso/login', requestOrigin(request));
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
    return asAdmin(request);
  }

  if (isUnder(pathname, '/admin')) {
    const config = credentials();
    if (!config) {
      if (process.env.NODE_ENV !== 'production') return asAdmin(request);
      return new NextResponse(ADMIN_CLOSED, {
        status: 503,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
      });
    }
    if (!(await unseal(request.cookies.get(SESSION_COOKIE)?.value, config.sessionSecret))) {
      // From the public origin, not request.url: behind Render that is the
      // container's bind address (http://0.0.0.0:10000).
      const login = new URL('/sso/login', requestOrigin(request));
      login.searchParams.set('next', pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
    return asAdmin(request);
  }

  return intl(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
