import { ContentEditor, type ContentOverride } from '@/components/admin/content/content-editor';
import { flattenStrings } from '@/components/admin/content/flatten';
import { LOCALES } from '@/lib/constants';
import { store } from '@/lib/store';
import en from '@/messages/en.json';
import th from '@/messages/th.json';
import zh from '@/messages/zh.json';
import { requireAdminPage } from '@/lib/auth/admin';

type SiteLocale = (typeof LOCALES)[number];

const MESSAGES: Record<SiteLocale, unknown> = { th, en, zh };

const siteLocaleOf = (value: string | string[] | undefined): SiteLocale =>
  (LOCALES as readonly string[]).includes(String(value)) ? (value as SiteLocale) : 'th';

/**
 * The public site's text editor (the old ContentPage). The built-in text is
 * every string leaf of messages/<lang>.json; an override (site_content) wins
 * over it on the public pages. `?lang=` picks the website's language — th, en
 * or zh — independent of the admin's own language.
 */
export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage();
  const lang = siteLocaleOf((await searchParams).lang);
  const defaults = flattenStrings(MESSAGES[lang]);
  const rows = await store().siteContent.list(lang);

  const overrides: Record<string, ContentOverride> = {};
  for (const row of rows) {
    overrides[row.key] = { value: row.value, updatedBy: row.updatedBy, updatedAt: row.updatedAt.toISOString() };
  }

  return <ContentEditor lang={lang} defaults={defaults} overrides={overrides} />;
}
