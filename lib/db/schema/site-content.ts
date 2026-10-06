import { sql } from 'drizzle-orm';
import { pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { lifecycle, timestamps } from './columns';
import { locale } from './enums';
import { primaryPk, publicId } from './ids';

/**
 * Admin-edited overrides of the site's text.
 *
 * The defaults are messages/{th,en,zh}.json in the repo; a row here replaces one
 * key in one language (`home.hero.title` in `th`). "Revert to default" soft-
 * deletes the row. Plain text only — rendered as text, never as HTML.
 */
export const siteContent = pgTable(
  'site_content',
  {
    pk: primaryPk(),
    id: publicId(),
    key: text('key').notNull(),
    locale: locale('locale').notNull(),
    ...lifecycle(),
    value: text('value').notNull(),
    updatedBy: text('updated_by'),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex('site_content_id_idx').on(table.id),
    uniqueIndex('site_content_key_locale_live_idx')
      .on(table.key, table.locale)
      .where(sql`status <> 'DELETED'`),
  ],
);

export type SiteContentRow = typeof siteContent.$inferSelect;
