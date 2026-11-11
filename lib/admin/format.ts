import { intlLocale, type AdminLocale } from '@/lib/i18n/admin';

/**
 * Dates in the admin, in Bangkok time. Thai uses the Thai calendar
 * ("6 ต.ค. 2569 14:51"), as the old admin's th-TH formatting did; English
 * uses day-month-year ("6 Oct 2026, 14:51"); Chinese "2026年10月6日 14:51".
 */
const TIME_ZONE = 'Asia/Bangkok';

export function formatDate(value: Date | string | null | undefined, locale: AdminLocale): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: TIME_ZONE }).format(
    new Date(value),
  );
}

/**
 * The time is built here, not left to Intl: CLDR 49 (Node 26) writes Thai times
 * as "14:51 น." while browsers on older CLDR write "14:51", so a client component
 * rendered on the server failed hydration. The date part is the same in every
 * CLDR, and "HH:mm" is what the admin has always shown.
 */
export function formatDateTime(value: Date | string | null | undefined, locale: AdminLocale): string {
  if (!value) return '—';
  const date = new Date(value);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).format(date);
  return `${formatDate(date, locale)}${locale === 'en' ? ',' : ''} ${time}`;
}
