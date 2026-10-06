import { notFound } from 'next/navigation';
import { serverEnv } from '@/lib/env';
import { UnavailableError } from '@/lib/errors';

/** Who is acting in the admin — written to created_by / updated_by / changed_by. */
export interface AdminActor {
  email: string;
}

/**
 * The gate in front of the admin: every /api/v1/admin endpoint and every
 * /admin page.
 *
 * SIGN-IN IS NOT BUILT YET (it will be SSO, as in shd_onelink). Until then:
 *
 *   development / test   open, acting as "dev@localhost" — the local
 *                        database only holds seed data
 *   production           closed: 503 from the API and a "not available yet"
 *                        page, so applicants' personal data is never
 *                        reachable without a sign-in
 *
 * When SSO lands, this is the one place that changes: read the session and
 * the person's permissions; throw UnauthorizedError (401) or ForbiddenError
 * (403).
 */
export async function adminActor(): Promise<AdminActor> {
  if (serverEnv().NODE_ENV !== 'production') return { email: 'dev@localhost' };
  throw new UnavailableError('The admin is not available yet: sign-in (SSO) has not been set up.');
}

/** The gate for API routes. Takes the request for when sign-in reads it. */
export async function requireAdmin(_request: Request): Promise<AdminActor> {
  return adminActor();
}

/**
 * The gate for admin PAGES — called at the top of every app/admin page before
 * it reads anything.
 *
 * The layout's "not available" screen is not enough on its own: Next renders
 * a page in parallel with its layout and streams the page's data into the
 * HTML even when the layout never shows it. Checking here means the data is
 * never read. (proxy.ts closes /admin in front of all of this as well.)
 */
export async function requireAdminPage(): Promise<AdminActor> {
  try {
    return await adminActor();
  } catch (error) {
    if (error instanceof UnavailableError) notFound();
    throw error;
  }
}
