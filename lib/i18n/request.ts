import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { log } from '@/lib/log';
import { store } from '@/lib/store';
import { ADMIN_AREA_HEADER, ADMIN_LOCALE_COOKIE, adminLocaleOf } from './admin';
import { routing } from './routing';

type Messages = { [key: string]: string | Messages | unknown[] };

/** `{ "home.hero.title": "…" }` → `{ home: { hero: { title: "…" } } }`, laid over `base`. */
function withOverrides(base: Messages, overrides: Record<string, string>): Messages {
  const result: Messages = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    const parts = key.split('.');
    let node: Messages = result;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      // An override never replaces a whole section or a list, only a string leaf.
      if (next === undefined || typeof next !== 'object' || Array.isArray(next)) node[part] = {};
      node = node[part] as Messages;
    }
    node[parts.at(-1)!] = value;
  }
  return result;
}

/**
 * Which language a request is answered in, and its messages.
 *
 * Public pages (/th, /en, /zh — the [locale] segment; also a 404 for a url
 * with no language, e.g. /favicon.ico, in Thai): the built-in text in
 * messages/<locale>.json with the admin's edits (site_content) laid over it.
 * Merged here, on the server, so a page arrives with the edited text already
 * in it (the old site fetched the edits after the first render, so the
 * default text flashed). If the database cannot be reached the built-in text
 * is used — the site stays up.
 *
 * The admin (/admin — marked by proxy.ts): the language from the
 * admin_locale cookie, Thai unless English was chosen, and only the admin's
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
  const base = (await import(`../../messages/${locale}.json`)).default as Messages;

  let overrides: Record<string, string> = {};
  try {
    overrides = await store().siteContent.overrides(locale);
  } catch (err) {
    log.warn({ err, locale }, 'site content overrides unavailable; using built-in text');
  }

  return { locale, messages: Object.keys(overrides).length ? withOverrides(base, overrides) : base };
});
