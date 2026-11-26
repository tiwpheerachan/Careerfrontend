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
  // Public pages are cached (app/[locale]/layout.tsx). Kept in memory only, and little of it (the
  // default is 50 MB of the instance's 512): a url with a dot or under /api… skips proxy.ts, so any
  // such name is a [locale] with a 404 of its own, and on disk those would pile up.
  cacheMaxMemorySize: 16 * 1024 * 1024,
  experimental: {
    isrFlushToDisk: false,
    // What Next buffers of a body sent to a page (proxy.ts matches it; /api is not matched and
    // has its own limits). The default is 10 MB per request; no page takes an upload.
    proxyClientMaxBodySize: '1mb',
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // The cached pages are this server's to keep, not the browser's: Next's own header allows a
      // year of stale-while-revalidate, which Chrome uses, and a save would not be seen.
      // Not expireTime: past it Next no longer keeps a page whose revalidation fails.
      { source: '/:locale(th|en|zh)/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-cache' }] },
      // A day, not longer: the names carry no hash, so a replaced picture keeps its url.
      {
        // Only names with an extension: proxy.ts redirects the others to a language.
        source: '/:dir(_img|images|videos)/:path(.*\\.\\w+)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      // Tried after public/: only a missing file gets here. Without this it matches
      // app/[locale]/[...rest], whose 404 keeps the day of caching set above. "/" is the one path
      // no route matches (proxy.ts, which redirects it, has already run), so Next answers its own
      // 404 with no-store.
      afterFiles: [{ source: '/:dir(_img|images|videos)/:path*', destination: '/' }],
      fallback: [],
    };
  },
};

// Points the plugin at lib/i18n/request.ts rather than its default location,
// which assumes a src/ directory this project does not have.
export default createNextIntlPlugin('./lib/i18n/request.ts')(nextConfig);
