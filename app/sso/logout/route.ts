import { NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/api/origin';
import { SESSION_COOKIE } from '@/lib/auth/session';

/**
 * Sign out of this app, and go straight back to signing in.
 *
 * Only this app. The central session stays open, so the sign-in this lands on
 * usually completes without a password and the reader is back where they
 * started, as themselves. That is the documented behaviour of one app in a
 * suite — ending every session at once is ขั้น C2, /oidc/end-session, which is
 * a different endpoint and not wired up here.
 *
 * What it is good for is the central system's own account picker: the cookie
 * here is gone, so whoever signs in next is whoever the central system says,
 * not whoever was cached in this browser.
 *
 * POST rather than GET so that no link, image or prefetch can sign somebody
 * out by being loaded.
 */
export async function POST(request: Request) {
  // To the signed-out page, not to /sso/login: that one goes straight to
  // the central system, which is still signed in, which comes straight back
  // — and Sign out looks like it did nothing. See app/sso/signed-out.
  const response = NextResponse.redirect(new URL('/sso/signed-out', requestOrigin(request)), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
