import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { DEVICE_SIZES, IMAGE_SIZES } from './lib/image-widths';

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
    // Nothing is resized while serving: scripts/build-images.mjs makes every width at build
    // time. Resizing in this process (sharp) took the 512 MB Render instance down. With a
    // custom loader /_next/image answers 404.
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    deviceSizes: DEVICE_SIZES,
    imageSizes: IMAGE_SIZES,
  },
  experimental: {
    // What Next buffers of a body sent to a page (proxy.ts matches it; /api is not matched and
    // has its own limits). The default is 10 MB per request; no page takes an upload.
    proxyClientMaxBodySize: '1mb',
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // A day, not longer: the names carry no hash, so a replaced picture keeps its url.
      {
        source: '/_img/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
};

// Points the plugin at lib/i18n/request.ts rather than its default location,
// which assumes a src/ directory this project does not have.
export default createNextIntlPlugin('./lib/i18n/request.ts')(nextConfig);
