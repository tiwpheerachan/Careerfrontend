import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_AREA_HEADER } from '@/lib/i18n/admin';
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
 * Named proxy.ts because that is what Next 16 calls this file — middleware.ts
 * is deprecated. The admin's sign-in gate (SSO, as in shd_onelink) joins this
 * file when it is built.
 *
 * Not matched: /api (JSON, no language), Next's own files, and anything with
 * a file extension (images, videos, robots.txt).
 */
/**
 * The admin, closed in production until sign-in exists — answered here, so no
 * admin page runs at all. (A layout showing "not available" is not enough:
 * Next renders the page beside its layout and streams the page's data into
 * the HTML regardless.) SSO's session check replaces this when it lands.
 */
const ADMIN_CLOSED = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SHDcareers · Admin</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f9fafb;font-family:ui-sans-serif,system-ui,sans-serif;color:#111827">
<main style="max-width:28rem;margin:1.5rem;padding:2rem;background:#fff;border:1px solid #e5e7eb;border-radius:1rem;text-align:center">
<h1 style="margin:0;font-size:1.25rem;font-weight:900">ระบบหลังบ้านยังไม่เปิดใช้งาน</h1>
<p style="margin:.5rem 0 0;font-size:.875rem;color:#6b7280">ต้องตั้งค่าการเข้าสู่ระบบ (SSO) ก่อน · The admin opens once sign-in (SSO) is set up.</p>
</main></body></html>`;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(ADMIN_CLOSED, {
        status: 503,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
      });
    }
    const headers = new Headers(request.headers);
    headers.set(ADMIN_AREA_HEADER, '1');
    return NextResponse.next({ request: { headers } });
  }
  return intl(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
