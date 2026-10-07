import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeNext, seal, SESSION_MS, unseal } from './session';

const SECRET = 'a-test-secret-that-is-long-enough-1234567890';
const who = { sub: 'u-1', name: 'สมชาย ใจดี', email: 'somchai@shd-technology.co.th' };

afterEach(() => {
  vi.useRealTimers();
});

describe('the session cookie', () => {
  it('round-trips, Thai names included', async () => {
    const session = await unseal(await seal(who, SECRET), SECRET);
    expect(session).toMatchObject(who);
  });

  it('is refused when signed with another secret', async () => {
    expect(await unseal(await seal(who, SECRET), `${SECRET}-other`)).toBeUndefined();
  });

  it('is refused when its contents are edited', async () => {
    const [, signature] = (await seal(who, SECRET)).split('.');
    const forged = Buffer.from(JSON.stringify({ ...who, sub: 'someone-else', exp: 9_999_999_999 })).toString(
      'base64url',
    );
    expect(await unseal(`${forged}.${signature}`, SECRET)).toBeUndefined();
  });

  it('expires after SESSION_MS', async () => {
    vi.useFakeTimers();
    const token = await seal(who, SECRET);
    vi.advanceTimersByTime(SESSION_MS - 1000);
    expect(await unseal(token, SECRET)).toBeDefined();
    vi.advanceTimersByTime(2000);
    expect(await unseal(token, SECRET)).toBeUndefined();
  });

  it('turns garbage into "not signed in", never a throw', async () => {
    for (const token of [undefined, '', 'x', 'x.y', '.', '%%%.%%%']) {
      expect(await unseal(token, SECRET)).toBeUndefined();
    }
  });
});

describe('safeNext', () => {
  it('lets a path on this site through', () => {
    expect(safeNext('/admin/jobs?q=1')).toBe('/admin/jobs?q=1');
  });

  it('sends anything else to the admin — no open redirect', () => {
    for (const value of [null, undefined, '', 'admin', 'https://evil.example', '//evil.example', '/\\evil.example']) {
      expect(safeNext(value)).toBe('/admin');
    }
  });
});
