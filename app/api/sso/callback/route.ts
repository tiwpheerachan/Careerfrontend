import { NextResponse, type NextRequest } from 'next/server';
import { requestOrigin } from '@/lib/api/origin';
import { credentials, exchange, SsoError } from '@/lib/auth/sso';
import { safeNext, seal, SESSION_COOKIE, SESSION_MS, STATE_COOKIE } from '@/lib/auth/session';
import { log } from '@/lib/log';

/**
 * Where the central system sends people back to.
 *
 * Everything here happens on the server. The code arrives in the query string,
 * is traded for an identity over a request the browser never sees, and what
 * goes back to the browser is our own signed cookie. The code itself is never
 * stored: it is worth one use for sixty seconds and is spent by the time this
 * handler returns.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // The public origin, not url. request.url carries the container's internal
  // bind address behind Render's proxy, and sending somebody there after a
  // successful sign-in lands them on http://0.0.0.0:10000. Query parameters
  // are read from url, which is correct — only its host is wrong.
  const origin = requestOrigin(request);
  const fail = (reason: string) => NextResponse.redirect(new URL(`/sso/error?reason=${reason}`, origin));

  const config = credentials();
  if (!config) return fail('setup');

  const code = url.searchParams.get('code');
  const returned = url.searchParams.get('state');
  if (!code || !returned) return fail('state');

  // The state cookie is read and then cleared no matter how this ends — it is
  // good for one sign-in, and leaving it behind would let a stale value be
  // replayed against a later attempt.
  // Read through NextRequest rather than off the raw header: the value is JSON
  // and Next percent-encodes what it writes, so the header holds %7B%22state…
  // and JSON.parse would reject every single sign-in.
  let expected: { state?: string; next?: string } = {};
  try {
    expected = JSON.parse(request.cookies.get(STATE_COOKIE)?.value ?? '{}');
  } catch {
    return fail('state');
  }
  if (!expected.state || expected.state !== returned) return fail('state');

  let identity;
  try {
    identity = await exchange(code, config);
  } catch (cause) {
    // The reason is deliberately coarse in the url — enough for the page to say
    // something useful, not enough to tell a stranger which half was wrong.
    log.error({ err: cause }, 'SSO verify failed');
    return fail(cause instanceof SsoError ? cause.reason : 'unavailable');
  }

  const response = NextResponse.redirect(new URL(safeNext(expected.next), origin));
  response.cookies.set(
    SESSION_COOKIE,
    await seal(
      {
        sub: identity.sub,
        // Keyed on sub, as the guide insists. The name and email are carried
        // for display only, which is why a missing one is a blank and not a
        // failure — nothing here looks anybody up by either.
        name: identity.name ?? '',
        email: identity.email ?? '',
      },
      config.sessionSecret,
    ),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.startsWith('https:'),
      path: '/',
      maxAge: Math.floor(SESSION_MS / 1000),
    },
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}
