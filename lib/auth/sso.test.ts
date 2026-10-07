import { afterEach, describe, expect, it, vi } from 'vitest';

/** SSO_ORIGIN is read when the module loads: each case loads it fresh. */
async function originWith(value: string | undefined): Promise<string> {
  vi.resetModules();
  if (value === undefined) vi.stubEnv('SSO_ORIGIN', undefined as unknown as string);
  else vi.stubEnv('SSO_ORIGIN', value);
  return (await import('./sso')).SSO_ORIGIN;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SSO_ORIGIN', () => {
  it('empty or unset means the company login (.env.example ships it empty)', async () => {
    expect(await originWith(undefined)).toBe('https://sso.shd-technology.co.th');
    expect(await originWith('')).toBe('https://sso.shd-technology.co.th');
    expect(await originWith('   ')).toBe('https://sso.shd-technology.co.th');
  });

  it('a set value wins, without its trailing slash', async () => {
    expect(await originWith('https://sso.example.test/')).toBe('https://sso.example.test');
  });

  it('the authorize url is absolute either way', async () => {
    vi.resetModules();
    vi.stubEnv('SSO_ORIGIN', '');
    const { authorizeUrl } = await import('./sso');
    const url = authorizeUrl(new Request('http://localhost:3000/sso/login'), 'careers', 'state-1');
    expect(url).toMatch(/^https:\/\/sso\.shd-technology\.co\.th\/api\/v1\/sso\/authorize\?/);
  });
});
