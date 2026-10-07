import 'server-only';
import type { LOCALES } from '@/lib/constants';
import en from '@/messages/en.json';
import th from '@/messages/th.json';
import zh from '@/messages/zh.json';

type SiteLocale = (typeof LOCALES)[number];

const MESSAGES: Record<SiteLocale, unknown> = { th, en, zh };

/**
 * The public site's built-in text for one key ("home.gallery.imageAltTop"),
 * from messages/<locale>.json — undefined when the site has no such string
 * (a removed key, or a list/section rather than one string).
 */
export function defaultTextOf(key: string, locale: SiteLocale): string | undefined {
  let node: unknown = MESSAGES[locale];
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.hasOwn(node, part)) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}
