import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { log } from '@/lib/log';
import { store } from '@/lib/store';
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
 * Which language this request is answered in (the [locale] url segment), and
 * its messages: the built-in text in messages/<locale>.json with the admin's
 * edits (site_content) laid over it.
 *
 * Merged here, on the server, so a page arrives with the edited text already
 * in it. (The old site fetched the edits in the browser after the first
 * render, so the default text flashed first.) If the database cannot be
 * reached the built-in text is used — the site stays up.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
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
