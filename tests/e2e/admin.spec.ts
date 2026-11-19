import { expect, test } from './support/fixtures';

/**
 * The admin, in development without SSO: open as dev@localhost (lib/auth/admin.ts).
 * With SSO configured (e.g. SSO_CLIENT_ID from .env.local) it is behind sign-in, and this skips.
 */

test('the admin dashboard loads', async ({ page, baseURL }) => {
  const response = await page.goto('/admin/dashboard');
  test.skip(
    !page.url().startsWith(baseURL!),
    `SSO is configured on this server: /admin went to ${new URL(page.url()).origin} to sign in`,
  );
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
