import type { APIRequestContext } from '@playwright/test';
import { expect, firstJob, test } from './support/fixtures';

/**
 * Applying: the Turnstile widget on both forms, and one real application sent
 * through the single-page form. The development env carries Cloudflare's test
 * site key (1x00000000000000000000AA), which always passes.
 */

/**
 * The widget's own iframe sits in a closed shadow root, out of reach; the hidden
 * input it puts next to it is not, and holds the token once the challenge passed.
 */
const turnstileToken = 'input[name="cf-turnstile-response"]';

/** The smallest file the server accepts as a PDF: it checks the "%PDF-" magic bytes (lib/files.ts). */
const tinyPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

/**
 * Why the server's database must not be written to, or undefined when it may.
 *
 * /api/v1/health does not name the database, so: a `next dev` on this machine,
 * whose .env.development.local points DATABASE_URL at the docker one and wins
 * over .env.local (production). The Next.js MCP endpoint exists only under `next dev`.
 * ponytail: trusts .env.development.local to set DATABASE_URL; a dev-only
 * "which database" answer from the app would make this a real check.
 */
async function notLocalDevServer(request: APIRequestContext, baseURL: string): Promise<string | undefined> {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseURL).hostname)) return `${baseURL} is not local`;
  const mcp = await request.post('/_next/mcp', {
    headers: { accept: 'application/json, text/event-stream' },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
  });
  if (!mcp.ok()) return `${baseURL} is not a next dev server`;
  const response = await request.get('/api/v1/health').catch(() => undefined);
  if (!response?.ok()) return 'GET /api/v1/health failed';
  const health = (await response.json()) as { status?: string };
  if (health.status !== 'ok') return 'the database is not reachable (npm run db:dev:up)';
  return undefined;
}

test('the apply page shows the Turnstile widget', async ({ page, request }) => {
  const job = await firstJob(request);
  test.skip(!job, 'no published job in the database (or GET /api/v1/jobs failed)');

  await page.goto(`/th/jobs/${encodeURIComponent(job!.code)}/apply`);
  await expect(page.locator(turnstileToken)).toHaveValue(/.+/);
});

test('the application form shows the Turnstile widget on its last step', async ({ page }) => {
  // Straight to the last step: the wizard restores its step from the tab's draft (components/application-form/wizard.tsx).
  await page.addInitScript(() =>
    sessionStorage.setItem('shd.applicationForm.draft.v1', JSON.stringify({ draft: {}, step: 6, furthest: 6 })),
  );
  await page.goto('/th/application-form');
  await expect(page.getByText('ขั้นที่ 7 จาก 7').first()).toBeVisible();
  await expect(page.locator(turnstileToken)).toHaveValue(/.+/);
});

test('an application with a résumé is sent', async ({ page, request, baseURL }) => {
  const job = await firstJob(request);
  test.skip(!job, 'no published job in the database (or GET /api/v1/jobs failed)');
  const reason = await notLocalDevServer(request, baseURL!);
  test.skip(!!reason, reason);

  await page.goto(`/th/jobs/${encodeURIComponent(job!.code)}/apply`);
  const form = page.getByRole('form', { name: 'สมัครงาน' });
  await form.getByLabel('ชื่อจริง').fill('ทดสอบ');
  await form.getByLabel('นามสกุล').fill('อีทูอี');
  await form.getByLabel('อีเมล').fill(`e2e+${Date.now()}@example.com`);
  await form.getByRole('textbox', { name: 'เบอร์โทรศัพท์' }).fill('812345678');
  await form.getByLabel('คุณทราบเกี่ยวกับตำแหน่งนี้ได้อย่างไร?').fill('Playwright');
  await form.getByLabel(/^เรซูเม่/).setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: tinyPdf });
  await form.getByLabel(/ฉันได้อ่านและยอมรับ/).check();

  // The test key answers on its own; the button stops being aria-disabled once every required field and the token are in.
  const submit = form.getByRole('button', { name: 'ส่งใบสมัคร' });
  await expect(submit).toHaveAttribute('aria-disabled', 'false');

  const posted = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/api/v1/jobs/${encodeURIComponent(job!.code)}/applications`) && r.request().method() === 'POST',
  );
  await submit.click();
  expect((await posted).status()).toBe(201);
  await expect(page.getByText('ส่งใบสมัครเรียบร้อย')).toBeVisible();
});
