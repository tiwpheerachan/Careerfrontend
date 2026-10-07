import { UnavailableError } from '@/lib/errors';
import { log } from '@/lib/log';
import { SSO_ORIGIN } from './sso';

/**
 * What this person may do in the admin, asked of the central system
 * (POST {SSO_ORIGIN}/api/v1/authz/effective). Ported from shd_onelink's
 * lib/auth/permissions.ts; this app has no row scopes (onelink's brands), only
 * resources.
 *
 * Asked rather than stored: an administrator changes a role in the central
 * console and the next thing this app does should already know — so nothing
 * here is written into the session cookie, which lives eight hours.
 *
 * The resources, declared to the central console (sso-schema/):
 *
 *   jobs          view = the job list and editor read-only · edit = create, change, publish/close · manage = delete
 *   applications  view = applicants, their files, the dashboard · edit = stage, notes · manage = delete, CSV export
 *   content       view = the site-text editor read-only · edit = change and revert text
 *
 * Levels: none < view < edit < manage.
 */

export type Level = 'none' | 'view' | 'edit' | 'manage';

const ORDER: Record<Level, number> = { none: 0, view: 1, edit: 2, manage: 3 };

export type ResourceKey = 'jobs' | 'applications' | 'content';
export const RESOURCE_KEYS: readonly ResourceKey[] = ['jobs', 'applications', 'content'];

export interface Permissions {
  hasAccess: boolean;
  /** Role keys, for display and logging. Never for deciding anything. */
  roles: string[];
  /** The level for any resource not named in `resources`. */
  baseLevel: Level;
  resources: Partial<Record<string, Level>>;
  /**
   * True when the central system has no permission model for this app, or
   * when this app has no CENTRAL_API_KEY to ask with: everyone who can sign in
   * may do everything. Logged loudly once (see permissionsFor).
   */
  unmanaged: boolean;
}

const OPEN: Permissions = { hasAccess: true, roles: [], baseLevel: 'manage', resources: {}, unmanaged: true };

/**
 * The key /authz/* is called with — NOT the SSO client_secret, which
 * /authz rejects. It comes from the app's Credentials page in the console.
 */
function apiKey(): string | undefined {
  return process.env.CENTRAL_API_KEY?.trim() || undefined;
}

let warned = false;

/** An answer is reused for a minute: a revoked role stops working within one. */
const TTL_MS = 60_000;
/** While the central system is down, a cached answer is trusted for fifteen minutes, then not. */
const STALE_MAX_MS = 15 * 60_000;

interface Entry {
  value: Permissions;
  fetchedAt: number;
}

/** One cache per process (Symbol.for on globalThis), not one per bundle — see onelink. */
const CACHE = Symbol.for('shd-careers.permissionsCache');
const cache: Map<string, Entry> = ((globalThis as { [CACHE]?: Map<string, Entry> })[CACHE] ??= new Map());

function asLevel(value: unknown): Level | undefined {
  return typeof value === 'string' && value in ORDER ? (value as Level) : undefined;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

interface EffectiveResponse {
  hasAccess?: boolean;
  roles?: unknown;
  base_level?: unknown;
  resources?: Record<string, unknown>;
}

export function parsePermissions(body: EffectiveResponse): Permissions {
  const resources: Record<string, Level> = {};
  for (const [key, value] of Object.entries(body.resources ?? {})) {
    const level = asLevel(value);
    if (level) resources[key] = level;
  }
  return {
    hasAccess: body.hasAccess !== false,
    roles: asStrings(body.roles),
    baseLevel: asLevel(body.base_level) ?? 'none',
    resources,
    unmanaged: false,
  };
}

/** The "Check again" button on the no-access page: forget the cached answer for one person. */
export function forgetPermissions(email: string): void {
  cache.delete(email);
}

/**
 * Permissions for one person (by EMAIL — /authz/effective identifies people by
 * email, not sub), from cache when fresh enough.
 *
 * Throws UnavailableError rather than returning "nothing" when the central
 * system cannot be reached and nothing usable is cached: an empty answer is
 * indistinguishable from "this person was removed", and showing that would
 * turn someone else's outage into a message that they lost their access.
 */
export async function permissionsFor(email: string): Promise<Permissions> {
  const key = apiKey();
  if (!key) {
    if (!warned) {
      warned = true;
      log.warn(
        'CENTRAL_API_KEY is not set — everyone who can sign in has full access to the admin. Set it to switch permissions on.',
      );
    }
    return OPEN;
  }
  if (!email) return OPEN;

  const cached = cache.get(email);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.value;

  try {
    const response = await fetch(`${SSO_ORIGIN}/api/v1/authz/effective`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ user: email }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`${response.status} from /authz/effective`);
    const value = parsePermissions((await response.json()) as EffectiveResponse);
    cache.set(email, { value, fetchedAt: Date.now() });
    return value;
  } catch (cause) {
    if (cached && Date.now() - cached.fetchedAt < STALE_MAX_MS) {
      log.warn({ err: cause }, 'authz: central system unreachable, using a stale answer');
      return cached.value;
    }
    log.error({ err: cause }, 'authz: central system unreachable');
    throw new UnavailableError('Could not check permissions with the central system. Please try again.');
  }
}

export function levelFor(permissions: Permissions, resource: ResourceKey): Level {
  if (permissions.unmanaged) return 'manage';
  if (!permissions.hasAccess) return 'none';
  return permissions.resources[resource] ?? permissions.baseLevel;
}

export function allows(permissions: Permissions, resource: ResourceKey, level: Exclude<Level, 'none'>): boolean {
  return ORDER[levelFor(permissions, resource)] >= ORDER[level];
}

/** Whether these permissions open anything at all (access granted with "none" everywhere is no access). */
export function opensAnything(permissions: Permissions): boolean {
  return RESOURCE_KEYS.some((resource) => allows(permissions, resource, 'view'));
}

/** Test seam: the cache is process-wide and outlives a single test. */
export function resetPermissionsCache(): void {
  cache.clear();
  warned = false;
}
