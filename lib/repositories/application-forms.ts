import { and, count, desc, eq, ilike, ne, or } from 'drizzle-orm';
import type { ApplicationFormAnswers, ApplicationFormSensitive } from '@/lib/application-form/schema';
import type { Database } from '@/lib/db/client';
import { applicationForms, jobs, type ApplicationFormRow, type Locale } from '@/lib/db/schema';
import type { APPLICATION_FORM_LETTERHEADS } from '@/lib/constants';
import { NotFoundError } from '@/lib/errors';
import { isUuid, likePattern, offsetOf, type Page } from './support';

export type Letterhead = (typeof APPLICATION_FORM_LETTERHEADS)[number];

export interface ApplicationFormCreate {
  locale: Locale;
  letterhead: Letterhead;
  jobsPk: number | null;
  position: string;
  nameTh: string;
  nameEn: string | null;
  email: string;
  mobile: string;
  answers: ApplicationFormAnswers;
  /** Null unless consented to. */
  sensitive: ApplicationFormSensitive | null;
}

export interface ApplicationFormListItem {
  id: string;
  letterhead: Letterhead;
  position: string;
  jobCode: string | null;
  nameTh: string;
  nameEn: string | null;
  email: string;
  mobile: string;
  createdAt: Date;
}

/** The paper application forms sent from the public site (migration 0005). */
export function createApplicationFormRepository(db: Database) {
  const live = ne(applicationForms.status, 'DELETED');

  return {
    async create(input: ApplicationFormCreate): Promise<{ id: string }> {
      const now = new Date();
      const [row] = await db
        .insert(applicationForms)
        .values({
          ...input,
          sensitiveConsentAt: input.sensitive ? now : null,
          certifiedAt: now,
        })
        .returning({ id: applicationForms.id });
      return row!;
    },

    /** Newest first; `q` matches the names, email, mobile or position. */
    async list(filter: Page & { q?: string }): Promise<{ items: ApplicationFormListItem[]; total: number }> {
      const conditions = [live];
      if (filter.q) {
        const pattern = likePattern(filter.q);
        conditions.push(
          or(
            ilike(applicationForms.nameTh, pattern),
            ilike(applicationForms.nameEn, pattern),
            ilike(applicationForms.email, pattern),
            ilike(applicationForms.mobile, pattern),
            ilike(applicationForms.position, pattern),
          )!,
        );
      }
      const where = and(...conditions);
      const [items, [total]] = await Promise.all([
        db
          .select({
            id: applicationForms.id,
            letterhead: applicationForms.letterhead,
            position: applicationForms.position,
            jobCode: jobs.code,
            nameTh: applicationForms.nameTh,
            nameEn: applicationForms.nameEn,
            email: applicationForms.email,
            mobile: applicationForms.mobile,
            createdAt: applicationForms.createdAt,
          })
          .from(applicationForms)
          .leftJoin(jobs, eq(jobs.pk, applicationForms.jobsPk))
          .where(where)
          .orderBy(desc(applicationForms.createdAt), desc(applicationForms.pk))
          .limit(filter.pageSize)
          .offset(offsetOf(filter)),
        db.select({ n: count() }).from(applicationForms).where(where),
      ]);
      return { items, total: total?.n ?? 0 };
    },

    /** One form, everything in it. 404 for a deleted or unknown id. */
    async get(id: string): Promise<ApplicationFormRow> {
      if (!isUuid(id)) throw new NotFoundError('application form', id);
      const [row] = await db
        .select()
        .from(applicationForms)
        .where(and(live, eq(applicationForms.id, id)))
        .limit(1);
      if (!row) throw new NotFoundError('application form', id);
      return row;
    },

    async softDelete(id: string, actor: string | null): Promise<void> {
      if (!isUuid(id)) throw new NotFoundError('application form', id);
      const [row] = await db
        .update(applicationForms)
        .set({ status: 'DELETED', deletedAt: new Date(), deletedBy: actor })
        .where(and(live, eq(applicationForms.id, id)))
        .returning({ id: applicationForms.id });
      if (!row) throw new NotFoundError('application form', id);
    },
  };
}

export type ApplicationFormRepository = ReturnType<typeof createApplicationFormRepository>;
