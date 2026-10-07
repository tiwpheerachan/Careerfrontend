/**
 * Talking to the central login service.
 *
 * Three calls make up a sign-in, and only the middle one happens in the
 * browser: send the person to /sso/authorize, receive a code back at our
 * callback, exchange that code for an identity from our own server. The
 * exchange carries client_secret, which is why it can only happen server-side —
 * a secret that reaches the browser is not a secret.
 *
 * Reference: "วิธีเชื่อมต่อแอปลูก" ขั้น B. Ported from shd_onelink.
 */

import { requestOrigin } from '@/lib/api/origin';
import { describeVerifyResponse } from './sso-debug';
import { log } from '@/lib/log';

/**
 * The central login service. `||`, not `??`: .env.example ships `SSO_ORIGIN=`
 * (empty) to mean "the default", and an empty origin makes every url built
 * from it relative — `new URL('/api/v1/sso/authorize')` throws, and sign-in
 * is a 500.
 */
export const SSO_ORIGIN = (process.env.SSO_ORIGIN?.trim() || 'https://sso.shd-technology.co.th').replace(/\/+$/, '');

export interface SsoCredentials {
  clientId: string;
  clientSecret: string;
  sessionSecret: string;
}

/**
 * The three values without which nothing here works.
 *
 * Returned together or not at all, so a half-configured deployment fails at the
 * first request with something readable instead of sending people to a login
 * that hands back a code nothing can exchange.
 *
 * SESSION_SECRET is ours, not the SSO service's: it signs our own cookie. The
 * other two are issued by the central system when SSO is switched on for the
 * app (ขั้น A) — client_secret is shown once.
 */
export function credentials(): SsoCredentials | undefined {
  const clientId = process.env.SSO_CLIENT_ID?.trim();
  const clientSecret = process.env.SSO_CLIENT_SECRET?.trim();
  const sessionSecret = process.env.SESSION_SECRET?.trim();
  if (!clientId || !clientSecret || !sessionSecret) return undefined;
  return { clientId, clientSecret, sessionSecret };
}

/**
 * The callback address, which must match what was registered, to the character.
 *
 * Derived from the same origin the short links are built from rather than
 * written down a second time: two places to change a hostname is one place to
 * forget. The service refuses to redirect anywhere it does not recognise —
 * that is what stops this being an open redirect — so a mismatch here is a 400
 * from them rather than a wrong page from us.
 */
export function callbackUrl(request: Request): string {
  return `${requestOrigin(request)}/api/sso/callback`;
}

/** Where to send someone who is not signed in. */
export function authorizeUrl(request: Request, clientId: string, state: string): string {
  const url = new URL(`${SSO_ORIGIN}/api/v1/sso/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl(request));
  url.searchParams.set('state', state);
  return url.toString();
}

/** What the central system knows about the person who just signed in. */
export interface Identity {
  /** Permanent. Names and email addresses change; this does not. */
  sub: string;
  name?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  /**
   * Per-app permissions, or null when this app has no permission model set up.
   *
   * Nothing reads it yet — this app has one kind of user. When that changes,
   * the rule from the guide is that `app` is an object even for somebody with
   * no access at all, so the question to ask is `app.has_access === false`,
   * never whether `app` is truthy.
   */
  app?: { has_access?: boolean } | null;
  /** When the central session began. Needed later by POST /sso/session. */
  iat?: number;
  /**
   * The OIDC identity token, ten minutes long.
   *
   * Declared because the service sends it, not because anything reads it —
   * this app keys everything on `sub` and signs its own cookie. It is listed
   * here so it is not an "undeclared field" the next person has to discover,
   * and it is worth knowing what it holds: the payload is the signed-in
   * person's name and email, base64 and readable by anyone holding the
   * string. Treat it as personal data, never log it.
   */
  id_token?: string;
}

export type SsoFailure = 'code' | 'client' | 'access' | 'inactive' | 'unavailable';

export class SsoError extends Error {
  /**
   * Plain field, not a `readonly` constructor parameter.
   *
   * The same reason PermissionsUnavailable.reason is written this way: the
   * scripts run through node's own type stripping, which refuses parameter
   * properties — it erases types, it does not generate the assignment one
   * implies. tsc and the Next build accept them, so this fails only in the
   * tools nothing else covers, and only once something in scripts/ reaches
   * lib/auth/permissions, which imports this module.
   */
  readonly reason: SsoFailure;

  constructor(reason: SsoFailure, message: string) {
    super(message);
    this.reason = reason;
  }
}

/**
 * Trades the one-time code for an identity.
 *
 * The code is good for sixty seconds and one use, so there is no retry here:
 * a second attempt with the same code is a 400 by definition, and the honest
 * response to a failure is to start the sign-in again.
 */
export async function exchange(code: string, config: SsoCredentials): Promise<Identity> {
  let response: Response;
  try {
    response = await fetch(`${SSO_ORIGIN}/api/v1/sso/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
      cache: 'no-store',
    });
  } catch (cause) {
    throw new SsoError('unavailable', `Could not reach the login service: ${String(cause)}`);
  }

  if (!response.ok) {
    const detail = await response.text();
    // The guide's four documented failures. They are told apart here because
    // they need different words on screen: "sign in again" for an expired
    // code is useless advice for an account that has been switched off.
    const reason =
      response.status === 401
        ? 'client'
        : response.status === 403
          ? /inactive/i.test(detail)
            ? 'inactive'
            : 'access'
          : response.status === 400
            ? 'code'
            : 'unavailable';
    throw new SsoError(reason, `${response.status} from /sso/verify: ${detail.slice(0, 300)}`);
  }

  // Read as text rather than json() so the debug line can describe exactly
  // what arrived, including a body that does not parse. Costs one string.
  const raw = await response.text();

  // Silent unless SSO_DEBUG is set; never prints a name or an email in the
  // mode that is safe to switch on in production. See sso-debug.ts.
  const description = describeVerifyResponse(raw);
  if (description) log.info({ ssoDebug: description }, 'SSO_DEBUG: what /sso/verify answered');

  let identity: Identity;
  try {
    identity = JSON.parse(raw) as Identity;
  } catch {
    throw new SsoError('unavailable', '/sso/verify returned a body that is not JSON.');
  }

  if (!identity?.sub) throw new SsoError('unavailable', '/sso/verify returned no sub.');
  return identity;
}
