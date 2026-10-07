import { NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/api/origin';
import { currentUser } from '@/lib/auth/current';
import { forgetPermissions } from '@/lib/auth/permissions';

/**
 * POST /sso/recheck — "Check again" on the no-access page.
 *
 * Permissions are cached for a minute, and somebody who has just been given
 * a role and is pressing the button is exactly the person that minute is
 * too long for. Forget the cached answer for them and send them back to the
 * admin, which asks afresh.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (user) forgetPermissions(user.email);
  return NextResponse.redirect(new URL('/admin', requestOrigin(request)), 303);
}
