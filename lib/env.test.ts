import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnv, serverEnv } from './env';

/** The smallest production environment that starts, before the variable under test. */
function production(extra: Record<string, string> = {}) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('STORAGE_DRIVER', 'supabase');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_placeholder_for_tests');
  vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
  vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site');
  for (const [k, v] of Object.entries(extra)) vi.stubEnv(k, v);
  resetServerEnv();
}

describe('production fails closed', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetServerEnv();
  });

  it('starts with Turnstile on', () => {
    production();
    expect(() => serverEnv()).not.toThrow();
  });

  it('refuses to start without Turnstile', () => {
    production({ TURNSTILE_SECRET_KEY: '', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '' });
    expect(() => serverEnv()).toThrow(/TURNSTILE_SECRET_KEY: is required in production/);
  });

  it('refuses SSO without CENTRAL_API_KEY — every account would be a full admin', () => {
    const sso = { SSO_CLIENT_ID: 'id', SSO_CLIENT_SECRET: 'secret', SESSION_SECRET: 'x'.repeat(32) };
    production(sso);
    expect(() => serverEnv()).toThrow(/CENTRAL_API_KEY/);
    production({ ...sso, CENTRAL_API_KEY: 'key' });
    expect(() => serverEnv()).not.toThrow();
  });
});
