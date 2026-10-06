import type { AdminLocale } from '@/lib/i18n/admin';

/**
 * Dates in the admin, in Bangkok time. Thai uses the Thai calendar
 * ("6 ต.ค. 2569 14:51"), as the old admin's th-TH formatting did; English
 * uses day-month-year ("6 Oct 2026, 14:51").
 */
const TIME_ZONE = 'Asia/Bangkok';
const tag = (locale: AdminLocale) => (locale === 'th' ? 'th-TH' : 'en-GB');

export function formatDate(value: Date | string | null | undefined, locale: AdminLocale): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(tag(locale), { dateStyle: 'medium', timeZone: TIME_ZONE }).format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined, locale: AdminLocale): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(tag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}
