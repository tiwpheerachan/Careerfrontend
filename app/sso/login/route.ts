import { NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/api/origin';
import { authorizeUrl, credentials } from '@/lib/auth/sso';
import { safeNext, STATE_COOKIE } from '@/lib/auth/session';

/**
 * Start of a sign-in (ported from shd_onelink): mint a state value, remember it, hand the person over.
 *
 * `state` is a random value we keep in an httpOnly cookie and compare when the
 * person comes back. Without it, anyone could feed a victim's browser a
 * callback url carrying their own code and sign the victim into the attacker's
 * account — the login equivalent of CSRF, which is what the guide is warning
 * about when it says to save it server-side.
 *
 * The page they were heading for rides along in the same cookie, so that a
 * bookmark to /analytics still lands on /analytics after the detour.
 */
export async function GET(request: Request) {
  // Every redirect below is built from the public origin, never from
  // request.url. Behind Render's load balancer request.url is the address the
  // container is bound to — http://0.0.0.0:10000 — so a redirect resolved
  // against it sends the browser to a host that exists only inside the box,
  // and a cookie whose Secure flag is decided by its scheme comes out
  // unmarked on a site served over https.
  const origin = requestOrigin(request);

  const config = credentials();
  if (!config) return NextResponse.redirect(new URL('/sso/error?reason=setup', origin));

  const next = safeNext(new URL(request.url).searchParams.get('next'));
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(authorizeUrl(request, config.clientId, state));
  response.cookies.set(STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    // Lax, not Strict: the person arrives back here as a top-level navigation
    // from another site, and Strict would withhold the cookie on exactly that
    // request — the one it exists to be read on.
    sameSite: 'lax',
    secure: origin.startsWith('https:'),
    path: '/',
    maxAge: 600,
  });
  return response;
}
