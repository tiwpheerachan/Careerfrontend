import { adminListContent, adminRevertContent, adminSetContent } from '@/lib/api/contracts';
import { handler, json, parseBody, parseQuery } from '@/lib/api/http';
import { adminLocaleOfRequest, adminTranslator } from '@/lib/admin/server-i18n';
import { requireAdmin } from '@/lib/auth/admin';
import { defaultTextOf } from '@/lib/content/defaults';
import { checkOverride, describeProblem } from '@/lib/content/validate';
import { BadRequestError } from '@/lib/errors';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/content?locale= */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'content', level: 'view' });
  const { locale } = parseQuery(request, adminListContent.query);
  return json({ locale, items: await store().siteContent.list(locale) });
});

/**
 * PUT /api/v1/admin/content — set one key in one language. The text must be
 * one the public site can render (lib/content/validate.ts): not empty, valid
 * ICU, the built-in text's {arguments} kept — else 400 with an issue on `value`.
 */
export const PUT = handler(async (request) => {
  const actor = await requireAdmin(request, { resource: 'content', level: 'edit' });
  const { key, locale, value } = await parseBody(request, adminSetContent.body.schema);
  const problem = checkOverride(value, defaultTextOf(key, locale), locale);
  if (problem) {
    const message = describeProblem(problem, adminTranslator(adminLocaleOfRequest(request), 'content'));
    throw new BadRequestError('The request body is not valid.', [{ path: 'value', message }]);
  }
  await store().siteContent.set(key, locale, value, actor.email);
  return new Response(null, { status: 204 });
});

/** DELETE /api/v1/admin/content?key=&locale= — back to the built-in text. */
export const DELETE = handler(async (request) => {
  const actor = await requireAdmin(request, { resource: 'content', level: 'edit' });
  const { key, locale } = parseQuery(request, adminRevertContent.query);
  await store().siteContent.revert(key, locale, actor.email);
  return new Response(null, { status: 204 });
});
