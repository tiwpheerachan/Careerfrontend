import { content } from '@/lib/api/contracts';
import { handler, json, parseQuery } from '@/lib/api/http';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

/** GET /api/v1/content?locale= — the site text the admin has changed, for one language. */
export const GET = handler(async (request) => {
  const { locale } = parseQuery(request, content.query);
  return json({ locale, overrides: await store().siteContent.overrides(locale) });
});
