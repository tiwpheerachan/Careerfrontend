import { test as base, expect, type APIRequestContext } from '@playwright/test';

/**
 * What every scenario starts from: the page's console errors and uncaught
 * exceptions, collected for the whole test and checked when it ends, so a page
 * that renders but throws in the browser still fails.
 */

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use, testInfo) => {
      const seen: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') seen.push(`${page.url()}: ${message.text()}`);
      });
      page.on('pageerror', (error) => seen.push(`${page.url()}: ${error.message}`));
      await use(seen);
      // Only on a test that otherwise passed: a skipped or failed one already says why.
      if (testInfo.status === 'passed') expect(seen, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** The first published job, or undefined when the database has none (or cannot be reached). */
export async function firstJob(request: APIRequestContext): Promise<{ code: string; title: string } | undefined> {
  const response = await request.get('/api/v1/jobs');
  if (!response.ok()) return undefined;
  const { jobs } = (await response.json()) as { jobs: Array<{ code: string; title: string }> };
  return jobs[0];
}
