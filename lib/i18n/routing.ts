import { defineRouting } from 'next-intl/routing';
import { LOCALES } from '@/lib/constants';

/**
 * The public site's languages, and the url prefix that carries them:
 * /th/jobs, /en/jobs, /zh/jobs.
 *
 * A prefix rather than onelink's cookie because this site is meant to be found
 * by search engines: each language needs its own url to be indexed and linked
 * with hreflang. (onelink cannot, because its short codes live at the root.)
 *
 * A visitor arriving at a bare path is sent to the language their browser
 * asks for, else Thai.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: 'th',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
