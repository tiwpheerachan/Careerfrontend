import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: the careers site and its admin, in a browser, against the
 * development server and the development database (`npm run db:dev:up`).
 * `npm run e2e`.
 *
 * The `npm run dev` already on :3000 is reused; one is started only when
 * nothing answers there. E2E_BASE_URL points the suite at another server.
 *
 * A started server gets the SSO variables blanked, so the admin is open as
 * dev@localhost (lib/auth/admin.ts). A reused one keeps whatever its env
 * files say: with SSO on, the admin test skips rather than signs in.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  // One dev server and one database: a cold `next dev` compiles each route on
  // its first request, and parallel first requests only make that slower.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // First visits compile the route.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        // Never kill or replace a developer's running server.
        reuseExistingServer: true,
        timeout: 180_000,
        env: { SSO_CLIENT_ID: '', SSO_CLIENT_SECRET: '', SESSION_SECRET: '', APPLY_SHEET_WEBHOOK_URL: '' },
        stdout: 'pipe',
      },
});
