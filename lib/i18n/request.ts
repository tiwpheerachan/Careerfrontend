import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { ADMIN_AREA_HEADER, ADMIN_LOCALE_COOKIE, adminLocaleOf } from './admin';
import { publicMessages } from './public-messages';
import { routing } from './routing';

/**
 * Which language a request is answered in, and its messages.
 *
 * Public pages (/th, /en, /zh — the [locale] segment; also a 404 for a url
 * with no language, e.g. /favicon.ico, in Thai): the built-in text in
 * messages/<locale>.json with the admin's edits (site_content) laid over it.
 * Merged here, on the server, so a page arrives with the edited text already
 * in it (the old site fetched the edits after the first render, so the
 * default text flashed). Without the database: lib/i18n/public-messages.ts.
 * These pages are cached for everyone, so nothing here may read the visitor's
 * cookies or headers once the language is known.
 *
 * The admin (/admin — marked by proxy.ts): the language from the
 * admin_locale cookie (th, en or zh; Thai unless another was chosen), and only the admin's
 * own messages (messages/admin/<locale>.json) — the public site's text is not
 * shipped to it, nor the admin's to visitors.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  if (requested === undefined && (await headers()).get(ADMIN_AREA_HEADER) === '1') {
    const locale = adminLocaleOf((await cookies()).get(ADMIN_LOCALE_COOKIE)?.value);
    return { locale, messages: (await import(`../../messages/admin/${locale}.json`)).default };
  }

  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await publicMessages(locale) };
});
