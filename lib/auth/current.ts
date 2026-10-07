import { cookies } from 'next/headers';
import { SESSION_COOKIE, unseal, type Session } from './session';

/**
 * Who is signed in, for server components. (Ported from shd_onelink.)
 *
 * proxy.ts has already turned away anyone without a valid cookie by the time a
 * gated page renders, so this returning undefined there would mean the gate and
 * this disagree. It is still typed as optional because the sign-in pages are
 * outside the gate and call it too.
 */
export async function currentUser(): Promise<Session | undefined> {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) return undefined;
  return unseal((await cookies()).get(SESSION_COOKIE)?.value, secret);
}
