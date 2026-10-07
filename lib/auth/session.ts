/**
 * The signed cookie that says who is signed in to the admin.
 *
 * Ported from shd_onelink (lib/auth/session.ts) unchanged except for the cookie
 * names, which are this app's own: cookies are not port-scoped, so on
 * localhost onelink (:3000) and this app (:3100) would otherwise overwrite
 * each other's session.
 *
 * Written with Web Crypto and no dependency, because this code has to run in
 * two places with different runtimes: the route handlers that create the
 * session (Node) and proxy.ts that checks it on every page request (Edge).
 * crypto.subtle is the one HMAC available in both, and a session library that
 * assumes Node would leave the check in the proxy unable to verify what the
 * callback wrote.
 *
 * The cookie holds the identity and nothing else. It is signed rather than
 * encrypted: its contents are the reader's own name and email, which they
 * already know, and signing is what stops them being edited into someone
 * else's. A stolen cookie is a valid session until it expires — see SESSION_MS
 * for what that is worth here.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * How long a sign-in lasts.
 *
 * Eight hours, not a week, and the reason is a hole this app has not closed
 * yet: nothing asks the central system whether the person is still employed.
 * "ขั้น C — ออกจากระบบพร้อมกัน" in the integration guide is the endpoint that
 * would answer that (POST /sso/session, and end the session on active ===
 * false). Until that is wired, a revoked account keeps working here until the
 * cookie expires, so the cookie does not get to live long. One working day is
 * the compromise: nobody is asked to sign in twice before lunch, and nobody
 * keeps access overnight after being switched off.
 */
export const SESSION_MS = 8 * 60 * 60 * 1000;

export const SESSION_COOKIE = 'shd_careers_session';
export const STATE_COOKIE = 'shd_careers_sso_state';

export interface Session {
  /** The central system's permanent id for this person. The key for everything. */
  sub: string;
  name: string;
  email: string;
  /** Unix seconds this cookie stops being accepted. */
  exp: number;
}

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Backed by an explicit ArrayBuffer: crypto.subtle wants a BufferSource, and a
// bare `new Uint8Array(n)` is typed over ArrayBufferLike, which includes
// SharedArrayBuffer and so is not one.
function unb64url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/**
 * Identity in, cookie value out.
 *
 * The payload is encoded to UTF-8 bytes before base64, not passed to btoa as a
 * string: btoa throws on anything above U+00FF, and the names this carries are
 * Thai.
 */
export async function seal(session: Omit<Session, 'exp'>, secret: string): Promise<string> {
  const payload: Session = { ...session, exp: Math.floor((Date.now() + SESSION_MS) / 1000) };
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return `${body}.${b64url(new Uint8Array(signature))}`;
}

/**
 * Cookie value in, identity out — or undefined for anything not exactly right.
 *
 * Undefined covers every failure on purpose: a bad signature, a truncated
 * cookie, an expired one, JSON that does not parse. The caller's only sensible
 * response to all of them is the same, and a thrown error here would have to be
 * caught in the proxy on every request to avoid turning a stale cookie into a
 * 500 on a page that should just ask the person to sign in again.
 */
export async function unseal(token: string | undefined, secret: string): Promise<Session | undefined> {
  if (!token) return undefined;
  const [body, signature] = token.split('.');
  if (!body || !signature) return undefined;

  try {
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), unb64url(signature), encoder.encode(body));
    if (!valid) return undefined;

    const session = JSON.parse(decoder.decode(unb64url(body))) as Session;
    if (typeof session.sub !== 'string' || !session.sub) return undefined;
    if (typeof session.exp !== 'number' || session.exp * 1000 <= Date.now()) return undefined;
    return session;
  } catch {
    return undefined;
  }
}

/**
 * Where to send someone after they sign in.
 *
 * Only a path on this site is allowed through. The value arrives in a query
 * string, and letting it be a full url would turn the sign-in route into an
 * open redirect — the same class of bug the SSO service refuses unregistered
 * redirect_uri values to avoid. "//evil.example.com" is a url that looks like a
 * path, which is why the second character is checked too.
 */
export function safeNext(value: string | null | undefined): string {
  // Home for this app is the admin — the public site needs no sign-in.
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/admin';
  return value;
}
