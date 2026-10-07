import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return { title: '404', description: t('notFound') };
}

/**
 * The localized 404 — ported from frontend/src/pages/NotFoundPage.tsx.
 * Extra top padding (pt-28) so the card starts below the fixed navbar; the
 * old py-16 put it underneath.
 */
export default function NotFound() {
  const t = useTranslations('common');
  return (
    <section className="container-page pt-28 pb-16">
      <div className="card p-10">
        <h1 className="text-2xl font-black">404</h1>
        <p className="mt-2 text-sm text-slate-600">{t('notFoundPage.body')}</p>
        {/* A closed or removed job lands here too: the open jobs are the way on. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/jobs" className="btn btn-primary">
            {t('notFoundPage.jobs')}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t('notFoundPage.home')}
          </Link>
        </div>
      </div>
    </section>
  );
}
