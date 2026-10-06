import { and, asc, eq, ne } from 'drizzle-orm';
import type { Database } from '@/lib/db/client';
import { siteContent, type Locale } from '@/lib/db/schema';
import { NotFoundError } from '@/lib/errors';

/**
 * Admin overrides of the site's text, one row per key per language. The
 * defaults stay in messages/*.json; these win over them when present.
 */
export function createSiteContentRepository(db: Database) {
  const live = ne(siteContent.status, 'DELETED');

  return {
    /** `{ "home.hero.title": "…" }` for one language — what the public pages merge over messages/. */
    async overrides(locale: Locale): Promise<Record<string, string>> {
      const rows = await db
        .select({ key: siteContent.key, value: siteContent.value })
        .from(siteContent)
        .where(and(live, eq(siteContent.locale, locale)));
      return Object.fromEntries(rows.map((r) => [r.key, r.value]));
    },

    /** With who changed each and when, for the admin editor. */
    async list(locale: Locale) {
      return db
        .select({
          key: siteContent.key,
          value: siteContent.value,
          updatedBy: siteContent.updatedBy,
          updatedAt: siteContent.updatedAt,
        })
        .from(siteContent)
        .where(and(live, eq(siteContent.locale, locale)))
        .orderBy(asc(siteContent.key));
    },

    /** Sets one key in one language, replacing any current override. */
    async set(key: string, locale: Locale, value: string, actor: string | null): Promise<void> {
      await db
        .insert(siteContent)
        .values({ key, locale, value, updatedBy: actor })
        .onConflictDoUpdate({
          target: [siteContent.key, siteContent.locale],
          targetWhere: ne(siteContent.status, 'DELETED'),
          set: { value, updatedBy: actor },
        });
    },

    /** Back to the default text: the override is soft-deleted and kept. 404 when there was none. */
    async revert(key: string, locale: Locale, actor: string | null): Promise<void> {
      const [row] = await db
        .update(siteContent)
        .set({ status: 'DELETED', deletedAt: new Date(), deletedBy: actor, updatedBy: actor })
        .where(and(live, eq(siteContent.key, key), eq(siteContent.locale, locale)))
        .returning({ key: siteContent.key });
      if (!row) throw new NotFoundError('content override', `${locale}:${key}`);
    },
  };
}

export type SiteContentRepository = ReturnType<typeof createSiteContentRepository>;
