import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnavailableError } from '@/lib/errors';
import {
  allows,
  forgetPermissions,
  levelFor,
  opensAnything,
  parsePermissions,
  permissionsFor,
  resetPermissionsCache,
  type Permissions,
} from './permissions';

const BASE: Permissions = { hasAccess: true, roles: ['hr'], baseLevel: 'none', resources: {}, unmanaged: false };

const answer = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

beforeEach(() => {
  resetPermissionsCache();
  process.env.CENTRAL_API_KEY = 'test-key';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.CENTRAL_API_KEY;
});

describe('levels', () => {
  it('a named resource wins over the base level', () => {
    const p = { ...BASE, baseLevel: 'manage' as const, resources: { jobs: 'view' as const } };
    expect(levelFor(p, 'jobs')).toBe('view');
    expect(levelFor(p, 'content')).toBe('manage');
  });

  it('none < view < edit < manage', () => {
    const p = { ...BASE, resources: { applications: 'edit' as const } };
    expect(allows(p, 'applications', 'view')).toBe(true);
    expect(allows(p, 'applications', 'edit')).toBe(true);
    expect(allows(p, 'applications', 'manage')).toBe(false);
  });

  it('no access means nothing, whatever the levels say', () => {
    expect(allows({ ...BASE, hasAccess: false, baseLevel: 'manage' }, 'jobs', 'view')).toBe(false);
  });

  it('unmanaged (no permission model) means everything', () => {
    expect(allows({ ...BASE, unmanaged: true }, 'applications', 'manage')).toBe(true);
  });

  it('opensAnything: access granted with "none" everywhere is no access', () => {
    expect(opensAnything(BASE)).toBe(false);
    expect(opensAnything({ ...BASE, resources: { content: 'view' } })).toBe(true);
  });
});

describe('parsePermissions', () => {
  it('reads the central answer, dropping levels it does not know', () => {
    const p = parsePermissions({
      hasAccess: true,
      roles: ['hr', 7],
      base_level: 'view',
      resources: { jobs: 'manage', applications: 'owner' },
    });
    expect(p).toEqual({
      hasAccess: true,
      roles: ['hr'],
      baseLevel: 'view',
      resources: { jobs: 'manage' },
      unmanaged: false,
    });
  });

  it('an absent base level is none, not everything', () => {
    expect(parsePermissions({}).baseLevel).toBe('none');
  });
});

describe('permissionsFor', () => {
  it('asks /authz/effective by email with the API key', async () => {
    const fetch = answer({ hasAccess: true, base_level: 'view' });
    vi.stubGlobal('fetch', fetch);
    expect((await permissionsFor('a@shd.co.th')).baseLevel).toBe('view');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/authz\/effective$/);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-key');
    expect(JSON.parse(init.body as string)).toEqual({ user: 'a@shd.co.th' });
  });

  it('reuses an answer for a minute; forgetPermissions asks again', async () => {
    const fetch = answer({ hasAccess: true, base_level: 'view' });
    vi.stubGlobal('fetch', fetch);
    await permissionsFor('a@shd.co.th');
    await permissionsFor('a@shd.co.th');
    expect(fetch).toHaveBeenCalledTimes(1);
    forgetPermissions('a@shd.co.th');
    await permissionsFor('a@shd.co.th');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('central system down: a recent answer is trusted, none at all is "unavailable" — never "no access"', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', answer({ hasAccess: true, base_level: 'edit' }));
    await permissionsFor('a@shd.co.th');

    vi.stubGlobal('fetch', answer({ error: 'down' }, 502));
    vi.advanceTimersByTime(2 * 60_000);
    expect((await permissionsFor('a@shd.co.th')).baseLevel).toBe('edit');

    vi.advanceTimersByTime(20 * 60_000);
    await expect(permissionsFor('a@shd.co.th')).rejects.toBeInstanceOf(UnavailableError);
    await expect(permissionsFor('b@shd.co.th')).rejects.toBeInstanceOf(UnavailableError);
  });

  it('without CENTRAL_API_KEY everyone who signs in gets everything, and nothing is asked', async () => {
    delete process.env.CENTRAL_API_KEY;
    const fetch = answer({});
    vi.stubGlobal('fetch', fetch);
    expect((await permissionsFor('a@shd.co.th')).unmanaged).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
