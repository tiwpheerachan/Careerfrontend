import { serverEnv } from '@/lib/env';
import { BadRequestError, UnavailableError } from '@/lib/errors';

/**
 * Cloudflare Turnstile: proof a person, not a script, filled in the form.
 * Off (always passes) until TURNSTILE_SECRET_KEY and
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY are both set.
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export function turnstileEnabled(): boolean {
  return Boolean(serverEnv().TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | undefined, ip: string | undefined): Promise<void> {
  const secret = serverEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) throw new BadRequestError('Please complete the verification check.');

  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (ip && ip !== 'local') form.set('remoteip', ip);

  let outcome: { success: boolean };
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(8000),
    });
    outcome = (await response.json()) as { success: boolean };
  } catch {
    throw new UnavailableError('Could not reach the verification service. Please try again.');
  }
  if (!outcome.success) throw new BadRequestError('The verification check failed. Please try again.');
}
