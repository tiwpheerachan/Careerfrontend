import { describe, expect, it } from 'vitest';
import { expiresAt, newToken, stateOf } from './invitations';

const t0 = new Date('2026-10-07T09:00:00+07:00');
const at = (hours: number) => new Date(t0.getTime() + hours * 3600_000);
const base = { createdAt: t0, openedAt: null, revokedAt: null, invitees: 2, submitted: 0 };

describe('invitation link lifetime', () => {
  it('unopened: works for 24 hours after it is made', () => {
    expect(stateOf(base, at(23.9))).toBe('PENDING');
    expect(stateOf(base, at(24))).toBe('EXPIRED');
  });

  it('opened: 6 hours from the first opening, for everyone — even if that is after the first day', () => {
    const opened = { ...base, openedAt: at(20) };
    expect(stateOf(opened, at(25))).toBe('OPEN');
    expect(stateOf(opened, at(26))).toBe('EXPIRED');
    expect(expiresAt(opened)).toEqual(at(26));
  });

  it('completed once everyone sent; revoked wins over everything', () => {
    expect(stateOf({ ...base, submitted: 2 }, at(1))).toBe('COMPLETED');
    expect(stateOf({ ...base, revokedAt: at(1), submitted: 2 }, at(2))).toBe('REVOKED');
  });

  it('tokens are long and url-safe', () => {
    const token = newToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(token);
  });
});
