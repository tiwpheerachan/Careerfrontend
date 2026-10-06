/**
 * The admin's languages. Unlike the public site there is no url prefix: the
 * admin is not indexed, and its urls are bookmarked and shared between
 * colleagues who read different languages. The choice is per browser, in a
 * cookie (as in shd_onelink).
 */
export const ADMIN_LOCALES = ['th', 'en'] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

export const ADMIN_LOCALE_COOKIE = 'admin_locale';

export function adminLocaleOf(value: string | undefined): AdminLocale {
  return (ADMIN_LOCALES as readonly string[]).includes(value ?? '') ? (value as AdminLocale) : 'th';
}

/** Set by proxy.ts on every /admin request, read by lib/i18n/request.ts. Not trusted for access — only for which messages to load. */
export const ADMIN_AREA_HEADER = 'x-shd-area-admin';
