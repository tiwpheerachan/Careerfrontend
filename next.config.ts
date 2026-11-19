import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Sent on every response. No CSP yet: it needs a nonce for Next's inline
 * scripts plus the Turnstile and Sentry origins, and a wrong one breaks the
 * site — roll it out as Content-Security-Policy-Report-Only first.
 */
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Nothing frames this site; stops clickjacking on the admin and the apply form.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // The default minus 3840. The optimizer resizes in this process with sharp,
    // and a 4K variant of a large photo was the biggest memory spike on the
    // 512 MB Render instance. Sources in public/images are kept ≤ 2560 px wide.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    qualities: [75],
    // Photos change with a deploy, not daily: fewer re-optimisations, and
    // Cloudflare can hold /_next/image this long once a Cache Rule allows it.
    minimumCacheTTL: 2678400, // 31 days
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

// Points the plugin at lib/i18n/request.ts rather than its default location,
// which assumes a src/ directory this project does not have.
export default createNextIntlPlugin('./lib/i18n/request.ts')(nextConfig);
