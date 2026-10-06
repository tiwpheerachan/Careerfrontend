import type { Locale } from '@/lib/i18n/routing';

/**
 * A country's name in the page's language, from its ISO code. Jobs store
 * `TH`, `PH`…; this turns that into "ไทย" / "Thailand" / "泰国" with the
 * runtime's own data — no translation keys to keep in step.
 */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale === 'zh' ? 'zh-Hans' : locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** 🇹🇭 from TH. */
export function flagOf(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🏳️';
}
