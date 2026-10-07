import { adminListContent, adminRevertContent, adminSetContent } from '@/lib/api/contracts';
import { handler, json, parseBody, parseQuery } from '@/lib/api/http';
import { requireAdmin } from '@/lib/auth/admin';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/admin/content?locale= */
export const GET = handler(async (request) => {
  await requireAdmin(request, { resource: 'content', level: 'view' });
  const { locale } = parseQuery(request, adminListContent.query);
  return json({ locale, items: await store().siteContent.list(locale) });
});

/** PUT /api/v1/admin/content — set one key in one language. */
export const PUT = handler(async (request) => {
  const actor = await requireAdmin(request, { resource: 'content', level: 'edit' });
  const { key, locale, value } = await parseBody(request, adminSetContent.body.schema);
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
