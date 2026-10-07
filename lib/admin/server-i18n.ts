import 'server-only';
import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { adminLocaleOf, ADMIN_LOCALE_COOKIE, type AdminLocale } from '@/lib/i18n/admin';
import en from '@/messages/admin/en.json';
import th from '@/messages/admin/th.json';
import zh from '@/messages/admin/zh.json';

/**
 * The admin's own text in a route handler (/api/v1/admin/…), which has no
 * next-intl request config to lean on: the language from the admin_locale
 * cookie (as lib/api/http.ts validationLanguage reads it — Thai unless en or
 * zh was chosen), the messages from messages/admin/<locale>.json.
 */
const MESSAGES: Record<AdminLocale, AbstractIntlMessages> = { th, en, zh };

export function adminLocaleOfRequest(request: Request): AdminLocale {
  const cookie = new RegExp(`(?:^|;\\s*)${ADMIN_LOCALE_COOKIE}=(\\w+)`).exec(request.headers.get('cookie') ?? '')?.[1];
  return adminLocaleOf(cookie);
}

export type AdminTranslate = (key: string, values?: Record<string, string | number>) => string;

/** `t('columns.email')` under `namespace`, in `locale`. */
export function adminTranslator(locale: AdminLocale, namespace: string): AdminTranslate {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace });
  return (key, values) => (t as unknown as AdminTranslate)(key, values);
}
