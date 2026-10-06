import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

/**
 * Lint: the Next.js rules (React, hooks, Core Web Vitals, TypeScript), and
 * nothing about layout — Prettier owns formatting, and eslint-config-prettier
 * (last, so it wins) switches off every rule that would argue with it.
 *
 * Same setup as shd_onelink. Next 16 no longer lints during `next build`;
 * `npm run lint` and CI do.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: {
      // Leading underscore = unused on purpose.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // The docs build walks APIDoc's untyped output; typing it would be
    // guessing at a format the package does not publish. (Same as shd_onelink.)
    files: ['scripts/build-api-docs.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'drizzle/meta/**',
    // The old Vite frontend and FastAPI backend, kept only as a reference while
    // they are ported. Not part of this app.
    'frontend/**',
    'backend/**',
    'legacy/**',
  ]),
]);
