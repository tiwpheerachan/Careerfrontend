import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

// Points the plugin at lib/i18n/request.ts rather than its default location,
// which assumes a src/ directory this project does not have.
export default createNextIntlPlugin('./lib/i18n/request.ts')(nextConfig);
