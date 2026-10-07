/**
 * How long an invitation link works, and what state it is in. Plain data:
 * the admin, the invitee's page and the API all ask the same questions.
 *
 *   PENDING    made, nobody on it has opened it yet — good for 24 hours
 *   OPEN       someone on it opened it — good for 6 hours from then, for all
 *   COMPLETED  everyone on it has sent their evaluation
 *   EXPIRED    the time ran out; HR makes a new link
 *   REVOKED    HR switched it off
 *
 * (Asked for 2026-10-07: one shared link; 1 day if unopened, 6 hours once
 * opened; each person sends once, and their part closes.)
 */
export const UNOPENED_TTL_MS = 24 * 60 * 60 * 1000;
export const OPENED_TTL_MS = 6 * 60 * 60 * 1000;

export const INVITATION_STATES = ['PENDING', 'OPEN', 'COMPLETED', 'EXPIRED', 'REVOKED'] as const;
export type InvitationState = (typeof INVITATION_STATES)[number];

export interface InvitationTimes {
  createdAt: Date;
  openedAt: Date | null;
  revokedAt: Date | null;
  /** How many people are on it, and how many have sent. */
  invitees: number;
  submitted: number;
}

/** When it stops working (or stopped), whatever its state. */
export function expiresAt(inv: Pick<InvitationTimes, 'createdAt' | 'openedAt'>): Date {
  return inv.openedAt
    ? new Date(inv.openedAt.getTime() + OPENED_TTL_MS)
    : new Date(inv.createdAt.getTime() + UNOPENED_TTL_MS);
}

export function stateOf(inv: InvitationTimes, now: Date = new Date()): InvitationState {
  if (inv.revokedAt) return 'REVOKED';
  if (inv.invitees > 0 && inv.submitted >= inv.invitees) return 'COMPLETED';
  if (now.getTime() >= expiresAt(inv).getTime()) return 'EXPIRED';
  return inv.openedAt ? 'OPEN' : 'PENDING';
}

/** Whether an invitee can still evaluate through it. */
export const usable = (state: InvitationState) => state === 'PENDING' || state === 'OPEN';

/** A fresh link token: 32 random bytes, url-safe. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
