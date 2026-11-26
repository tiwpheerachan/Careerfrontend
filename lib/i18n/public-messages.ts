import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { log } from '@/lib/log';
import { store } from '@/lib/store';
import type { Locale } from './routing';

export type Messages = { [key: string]: string | Messages | unknown[] };

/** `{ "home.hero.title": "…" }` → `{ home: { hero: { title: "…" } } }`, laid over `base`. */
export function withOverrides(base: Messages, overrides: Record<string, string>): Messages {
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
 * How long a language's merged text is reused. A save clears it at once
 * (clearPublicMessages); this is for a save made by another instance — the
 * old one, during a deploy.
 */
const TTL_MS = 30_000;

interface State {
  fresh: Map<Locale, { at: number; messages: Promise<Messages> }>;
  /** The last text that was read, for when the database cannot be. */
  last: Map<Locale, Messages>;
}

/** Once per process (Symbol.for on globalThis), not once per bundle: the pages read it, the admin API clears it. */
const STATE = Symbol.for('shd-careers.publicMessages');
const state: State = ((globalThis as { [STATE]?: State })[STATE] ??= { fresh: new Map(), last: new Map() });

/** The admin's edits changed: the next page reads them. A read already under way is not kept. */
export function clearPublicMessages(): void {
  state.fresh.clear();
}

async function read(locale: Locale): Promise<Messages> {
  const [base, overrides] = await Promise.all([builtIn(locale), store().siteContent.overrides(locale)]);
  return Object.keys(overrides).length ? withOverrides(base, overrides) : base;
}

const builtIn = async (locale: Locale) => (await import(`../../messages/${locale}.json`)).default as Messages;

async function shared(locale: Locale): Promise<Messages> {
  const known = state.fresh.get(locale);
  if (known && Date.now() - known.at < TTL_MS) return known.messages;
  const entry = { at: Date.now(), messages: read(locale) };
  state.fresh.set(locale, entry);
  try {
    const messages = await entry.messages;
    if (state.fresh.get(locale) === entry) state.last.set(locale, messages);
    return messages;
  } catch (err) {
    if (state.fresh.get(locale) === entry) state.fresh.delete(locale);
    throw err;
  }
}

/**
 * The public site's text in one language: messages/<locale>.json with the
 * admin's edits (site_content) laid over it, read once per request.
 *
 * When the database cannot be reached the site stays up, and no page goes back
 * to unedited text for it: the last text this process read is used, and the
 * built-in text only when it never read any (a start without a database). Either
 * way a page built now is kept for seconds, not for its usual minutes. (It
 * cannot throw instead, as the pages' job lists do to keep the page already
 * made: on a first visit there is no such page, and the visitor would get an
 * error for text that is right here.)
 */
export const publicMessages = cache(async (locale: Locale): Promise<Messages> => {
  try {
    return await shared(locale);
  } catch (err) {
    log.warn({ err, locale }, 'site content overrides unavailable; using the last known text');
    await keepForSeconds();
    return state.last.get(locale) ?? builtIn(locale);
  }
});

/** Lowers the page's `revalidate` — Next takes the lowest on the page, and only a cache can say it while rendering. */
const keepForSeconds = unstable_cache(async () => true, ['public-messages-unavailable'], { revalidate: 5 });
