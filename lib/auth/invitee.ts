import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from '@/lib/env';
import {
  ConflictError,
  ForbiddenError,
  GoneError,
  NotFoundError,
  UnauthorizedError,
  UnavailableError,
} from '@/lib/errors';
import { usable } from '@/lib/interview/invitations';
import type { Invitation, Invitee } from '@/lib/repositories/interview-invitations';
import { store } from '@/lib/store';
import { SESSION_COOKIE, unseal } from './session';
import { credentials } from './sso';

/**
 * The gate in front of an invitation link (/evaluate/{token} and its API):
 * signed in with SSO as one of the people on it. The central role system is
 * NOT asked — the invitation itself is the grant, for this one candidate and
 * round. Someone signing in for the first time, with no role at all, gets in;
 * anyone not on the list does not, whatever their role.
 *
 * Without SSO configured: development acts as dev@localhost (invite that
 * address to try it); production is closed, as the admin is.
 */
export interface InviteeAccess {
  invitation: Invitation;
  invitee: Invitee;
  identity: { email: string; name: string | null };
}

/** Why the link cannot be used — for the page to say so in words. */
export type InviteeRefusal = 'signIn' | 'notFound' | 'notInvited' | 'expired' | 'revoked' | 'submitted' | 'unavailable';

async function identityFrom(sessionToken: string | undefined): Promise<{ email: string; name: string | null } | null> {
  const config = credentials();
  if (!config) {
    if (serverEnv().NODE_ENV !== 'production') return { email: 'dev@localhost', name: 'Dev' };
    throw new UnavailableError('Sign-in (SSO) is not set up.');
  }
  const session = await unseal(sessionToken, config.sessionSecret);
  return session?.email ? { email: session.email.toLowerCase(), name: session.name || null } : null;
}

/** Who may use the link, or why not. Never throws for an ordinary refusal. */
export async function checkInvitee(
  sessionToken: string | undefined,
  token: string,
): Promise<
  { ok: true; access: InviteeAccess } | { ok: false; reason: InviteeRefusal; invitation?: Invitation; email?: string }
> {
  let identity: { email: string; name: string | null } | null;
  try {
    identity = await identityFrom(sessionToken);
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  if (!identity) return { ok: false, reason: 'signIn' };

  const invitation = await store().interviewInvitations.byToken(token);
  if (!invitation) return { ok: false, reason: 'notFound' };
  const invitee = invitation.invitees.find((p) => p.email.toLowerCase() === identity.email);
  if (!invitee) return { ok: false, reason: 'notInvited', invitation, email: identity.email };
  if (invitee.submittedAt) return { ok: false, reason: 'submitted', invitation };
  if (invitation.state === 'REVOKED') return { ok: false, reason: 'revoked', invitation };
  if (!usable(invitation.state)) return { ok: false, reason: 'expired', invitation };
  return { ok: true, access: { invitation, invitee, identity } };
}

function cookieFrom(request: Request): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(header);
  return match ? decodeURIComponent(match[1]!) : undefined;
}

/** For the API: the access, or the matching error (401 / 403 / 404 / 409 / 410 / 503). */
export async function requireInvitee(request: Request, token: string): Promise<InviteeAccess> {
  const result = await checkInvitee(cookieFrom(request), token);
  if (result.ok) return result.access;
  switch (result.reason) {
    case 'signIn':
      throw new UnauthorizedError('Sign in with your company account to use this link.');
    case 'notFound':
      throw new NotFoundError('invitation', 'link');
    case 'notInvited':
      throw new ForbiddenError('This link is for other people — you are not on its list.');
    case 'submitted':
      throw new ConflictError('You have already sent your evaluation through this link.');
    case 'revoked':
      throw new GoneError('This link was switched off. Ask HR for a new one.');
    case 'expired':
      throw new GoneError('This link has expired. Ask HR for a new one.');
    default:
      throw new UnavailableError('Sign-in is not available right now.');
  }
}

/** For the page (server component): the same check, from the request's cookies. */
export async function checkInviteePage(token: string) {
  return checkInvitee((await cookies()).get(SESSION_COOKIE)?.value, token);
}
