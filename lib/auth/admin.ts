import { serverEnv } from '@/lib/env';
import { UnavailableError } from '@/lib/errors';

/** Who is acting in the admin — written to created_by / updated_by / changed_by. */
export interface AdminActor {
  email: string;
}

/**
 * The gate in front of every admin endpoint.
 *
 * SIGN-IN IS NOT BUILT YET (it will be SSO, as in shd_onelink). Until then:
 *
 *   development / test   open, acting as "dev@localhost" — the local
 *                        database only holds seed data
 *   production           closed: 503 on every admin endpoint, so applicants'
 *                        personal data is never reachable without a sign-in
 *
 * When SSO lands, this function is the one place that changes: it reads the
 * session and the person's permissions, and throws UnauthorizedError (401) or
 * ForbiddenError (403). Every admin route already calls it.
 */
export async function requireAdmin(_request: Request): Promise<AdminActor> {
  if (serverEnv().NODE_ENV !== 'production') return { email: 'dev@localhost' };
  throw new UnavailableError('The admin is not available yet: sign-in (SSO) has not been set up.');
}
