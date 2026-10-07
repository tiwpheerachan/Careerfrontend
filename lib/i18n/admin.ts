/**
 * The admin's languages. Unlike the public site there is no url prefix: the
 * admin is not indexed, and its urls are bookmarked and shared between
 * colleagues who read different languages. The choice is per browser, in a
 * cookie (as in shd_onelink).
 */
export const ADMIN_LOCALES = ['th', 'en', 'zh'] as const;
export type AdminLocale = (typeof ADMIN_LOCALES)[number];

/**
 * The Intl locale for dates and numbers: Thai with the Thai calendar
 * ("6 ต.ค. 2569"), English day-month-year ("6 Oct 2026"), Simplified Chinese
 * ("2026年10月6日").
 */
export function intlLocale(locale: AdminLocale): string {
  return locale === 'th' ? 'th-TH' : locale === 'zh' ? 'zh-CN' : 'en-GB';
}

export const ADMIN_LOCALE_COOKIE = 'admin_locale';

export function adminLocaleOf(value: string | undefined): AdminLocale {
  return (ADMIN_LOCALES as readonly string[]).includes(value ?? '') ? (value as AdminLocale) : 'th';
}

/** Set by proxy.ts on every /admin and /sso request, read by lib/i18n/request.ts. Not trusted for access — only for which messages to load. */
export const ADMIN_AREA_HEADER = 'x-shd-area-admin';

/** Set by proxy.ts on every /admin request: the path and query, so a page can send the person back to it after sign-in. */
export const ADMIN_PATH_HEADER = 'x-shd-path';
