import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { serverEnv } from '@/lib/env';
import { ADMIN_PATH_HEADER } from '@/lib/i18n/admin';
import { ForbiddenError, UnauthorizedError, UnavailableError } from '@/lib/errors';
import { allows, opensAnything, permissionsFor, type Level, type Permissions, type ResourceKey } from './permissions';
import { SESSION_COOKIE, unseal } from './session';
import { credentials } from './sso';

/**
 * The gate in front of the admin: every /api/v1/admin endpoint and every
 * /admin page. Sign-in is SHD SSO (sso.shd-technology.co.th), as in
 * shd_onelink; what a person may do comes from the central permission system
 * (lib/auth/permissions.ts).
 *
 *   SSO configured           a signed session cookie is required (401
 *                            otherwise); the person needs access to at least
 *                            one resource (403 otherwise) and the level each
 *                            action asks for (403).
 *   SSO not configured, dev  open, acting as "dev@localhost" — for working
 *                            locally before the SSO credentials exist
 *   SSO not configured, prod closed: 503. A missing variable never opens an
 *                            internal tool.
 */
export interface AdminActor {
  sub: string;
  email: string;
  name: string;
  permissions: Permissions;
}

/** What one action needs: a resource at a level. */
export interface Need {
  resource: ResourceKey;
  level: Exclude<Level, 'none'>;
}

const DEV_ACTOR: AdminActor = {
  sub: 'dev',
  email: 'dev@localhost',
  name: 'Admin (dev)',
  permissions: { hasAccess: true, roles: ['dev'], baseLevel: 'manage', resources: {}, unmanaged: true },
};

export const ssoConfigured = () => credentials() !== undefined;

async function actorFrom(token: string | undefined): Promise<AdminActor> {
  const config = credentials();
  if (!config) {
    if (serverEnv().NODE_ENV !== 'production') return DEV_ACTOR;
    throw new UnavailableError('The admin is not available yet: sign-in (SSO) has not been set up.');
  }
  const session = await unseal(token, config.sessionSecret);
  if (!session) throw new UnauthorizedError('Sign in to use the admin.');
  const permissions = await permissionsFor(session.email);
  if (!opensAnything(permissions)) throw new ForbiddenError('Your account has no access to the careers admin.');
  return { sub: session.sub, email: session.email || session.sub, name: session.name, permissions };
}

function check(actor: AdminActor, need: Need | undefined): AdminActor {
  if (need && !allows(actor.permissions, need.resource, need.level)) {
    throw new ForbiddenError(`You need ${need.level} access to ${need.resource} for this.`);
  }
  return actor;
}

function cookieFrom(request: Request): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(header);
  return match ? decodeURIComponent(match[1]!) : undefined;
}

/** The gate for API routes: 401 / 403 / 503 as AdminApiError-shaped JSON (lib/api/http.ts). */
/** Who requireAdmin found for each request — the audit trail names them (lib/api/audit.ts), refused ones too. */
const actors = new WeakMap<Request, AdminActor>();
export const adminActorOf = (request: Request): AdminActor | undefined => actors.get(request);

export async function requireAdmin(request: Request, need?: Need): Promise<AdminActor> {
  const actor = await actorFrom(cookieFrom(request));
  actors.set(request, actor);
  return check(actor, need);
}

/** Who is signed in to the admin, for server components (throws like requireAdmin). */
export async function adminActor(need?: Need): Promise<AdminActor> {
  return check(await actorFrom((await cookies()).get(SESSION_COOKIE)?.value), need);
}

/**
 * The gate for admin PAGES — called at the top of every app/admin page before
 * it reads anything.
 *
 * Not enough to leave it to the layout: Next renders a page beside its layout
 * and streams the page's data into the HTML even when the layout never shows
 * it. Checking here means the data is never read.
 *
 *   not signed in   → the sign-in, coming back to this page
 *   no permission   → /admin/forbidden (what is missing, and who to ask)
 *   unavailable     → nothing (the layout shows why)
 */
export async function requireAdminPage(need?: Need): Promise<AdminActor> {
  try {
    return await adminActor(need);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const path = (await headers()).get(ADMIN_PATH_HEADER) ?? '/admin';
      redirect(`/sso/login?next=${encodeURIComponent(path)}`);
    }
    if (error instanceof ForbiddenError && need) {
      redirect(`/admin/forbidden?need=${need.resource}.${need.level}`);
    }
    if (error instanceof UnavailableError || error instanceof ForbiddenError) notFound();
    throw error;
  }
}

/** What the person may do, as plain flags for client components (sidebar, buttons). */
export function abilitiesOf(actor: AdminActor) {
  const p = actor.permissions;
  return {
    jobs: { view: allows(p, 'jobs', 'view'), edit: allows(p, 'jobs', 'edit'), manage: allows(p, 'jobs', 'manage') },
    applications: {
      view: allows(p, 'applications', 'view'),
      edit: allows(p, 'applications', 'edit'),
      manage: allows(p, 'applications', 'manage'),
    },
    content: { view: allows(p, 'content', 'view'), edit: allows(p, 'content', 'edit') },
  };
}

export type Abilities = ReturnType<typeof abilitiesOf>;
