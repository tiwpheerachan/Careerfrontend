import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { failure } from '@/lib/api/http';
import { DOCS_ORIGIN } from '@/lib/api/docs-origin';
import { requireAdmin } from '@/lib/auth/admin';

/**
 * GET /api-docs — the API documentation (APIDoc v5, built by `npm run docs:api`
 * from the zod contracts into .apidoc/index.html), behind the admin gate:
 * open in development, closed in production until admin sign-in exists.
 *
 * Ported from shd_onelink. The page gets its own CSP: its inline scripts carry
 * a per-response nonce, and Try it may only call this same origin — the build's
 * placeholder origin is swapped for the host that served the page.
 */

let built: string | null = null;

async function page(): Promise<string | null> {
  if (built && process.env.NODE_ENV === 'production') return built;
  try {
    built = await readFile(path.join(process.cwd(), '.apidoc', 'index.html'), 'utf8');
    return built;
  } catch {
    return null;
  }
}

/** The origin this page was requested on, so Try it calls the server that served it. */
function servedFrom(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return new URL(request.url).origin;
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
    (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return failure(error);
  }

  const html = await page();
  if (!html) return new Response('The API docs are not built. Run: npm run docs:api', { status: 404 });

  const nonce = randomBytes(16).toString('base64');
  const body = html
    .replaceAll(DOCS_ORIGIN, servedFrom(request))
    .replace(/<script(?=[\s>])/g, `<script nonce="${nonce}"`);

  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
      'content-security-policy': [
        "default-src 'self'",
        // APIDoc's bundle compiles Vue templates at runtime (new Function), so
        // this page alone allows eval. Its content is our own static build.
        `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join('; '),
    },
  });
}
