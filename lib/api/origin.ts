/**
 * This site's public origin, for redirects and the SSO callback url.
 *
 * SITE_URL when it is set — the one value that says where the site lives, and
 * right whichever hostname a request arrived on. Otherwise the request's own
 * origin from the forwarded headers: behind Render's proxy `request.url`
 * carries the container's bind address (http://0.0.0.0:10000), so a redirect
 * resolved against it would send the browser somewhere that exists only
 * inside the box. (Same rule as shd_onelink's lib/api/origin.ts.)
 */
const configured = () => process.env.SITE_URL?.trim().replace(/\/+$/, '');

export function requestOrigin(request: Request): string {
  const base = configured();
  if (base) return base;

  const headers = request.headers;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  if (!host) return new URL(request.url).origin;

  // Assume https for anything that is not obviously a local development host.
  const proto =
    headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}
