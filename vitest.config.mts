import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The test database, and nothing else. Production env files are never loaded
// here: .env.test.local if there is one (CI passes the variable in instead),
// else the database tests/support/docker-compose.yml starts.
try {
  process.loadEnvFile?.('.env.test.local');
} catch {
  /* not present — rely on the ambient environment or the default below */
}
process.env.TEST_DATABASE_URL ??= 'postgres://postgres:postgres@127.0.0.1:55435/shd_career_test';
// Anything that reaches for the app's own connection lands on the test
// database too, never on whatever the shell had exported.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
delete process.env.SHD_ALLOW_PRODUCTION;
process.env.LOG_LEVEL ??= 'silent';
// Company standard time zone — the code under test runs in it, as in production.
process.env.TZ = 'Asia/Bangkok';
// Uploaded files go to a throwaway folder, never to Supabase.
process.env.STORAGE_DRIVER = 'local';
process.env.LOCAL_STORAGE_DIR = fileURLToPath(new URL('./.storage-test', import.meta.url));
for (const name of [
  'TURNSTILE_SECRET_KEY',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'APPLY_SHEET_WEBHOOK_URL',
  'TRUST_PROXY_HEADER',
  // Sign-in off: the admin routes run as "dev@localhost" unless a test turns SSO on.
  'SSO_CLIENT_ID',
  'SSO_CLIENT_SECRET',
  'SESSION_SECRET',
  'CENTRAL_API_KEY',
  'SSO_DEBUG',
]) {
  delete process.env[name];
}

const root = fileURLToPath(new URL('.', import.meta.url));
const alias = {
  '@': root,
  // `server-only` throws when imported outside a React Server environment;
  // tests are server code, so it stands in as an empty module.
  'server-only': fileURLToPath(new URL('./tests/support/empty.ts', import.meta.url)),
};

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'db',
          environment: 'node',
          include: ['lib/**/*.test.ts', 'tests/api/**/*.test.ts'],
          globalSetup: ['tests/support/global-setup.ts'],
          setupFiles: ['tests/support/setup.ts'],
          // One shared database: files must not truncate each other's rows mid-test.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/{components,pages}/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
