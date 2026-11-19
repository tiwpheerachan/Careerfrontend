import { expect, firstJob, test } from './support/fixtures';

/**
 * What a visitor meets: the home page in each language, and the way from the
 * job list to a job and on to its application form.
 */

for (const locale of ['th', 'en', 'zh'] as const) {
  test(`the home page renders in ${locale}`, async ({ page }) => {
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
}

test('the job list leads to a job and on to its application form', async ({ page, request }) => {
  const job = await firstJob(request);
  test.skip(!job, 'no published job in the database (or GET /api/v1/jobs failed)');

  await page.goto('/th/jobs');
  await page.getByRole('link', { name: job!.title }).first().click();
  await expect(page).toHaveURL(new RegExp(`/th/jobs/${encodeURIComponent(job!.code)}$`));
  await expect(page.getByRole('heading', { name: job!.title }).first()).toBeVisible();

  await page.getByRole('link', { name: 'สมัครงานตอนนี้' }).first().click();
  await expect(page).toHaveURL(/\/apply$/);
  await expect(page.getByRole('form', { name: 'สมัครงาน' })).toBeVisible();
});
