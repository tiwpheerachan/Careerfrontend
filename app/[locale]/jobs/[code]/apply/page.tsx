import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cache } from 'react';
import { ApplyForm } from '@/components/apply/apply-form';
import { ApplySidebar } from '@/components/apply/apply-sidebar';
import s from '@/components/apply/apply.module.css';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { redirectLegacyJob } from '@/lib/legacy-links';
import { store } from '@/lib/store';

type Props = { params: Promise<{ locale: string; code: string }> };

/** One query per request, shared by generateMetadata and the page. */
const loadJob = cache((code: string, locale: Locale) => store().jobs.getPublic(code, locale));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const job = await loadJob(code, locale as Locale);
  if (!job) return {};
  const tj = await getTranslations({ locale, namespace: 'jobs' });
  const t = await getTranslations({ locale, namespace: 'apply' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const title = `${tj('applyTitle')} · ${job.title}`;
  const description = t('metaDescription', { title: job.title });
  return {
    title,
    description,
    openGraph: { title: `${title} · ${meta('title')}`, description, type: 'website', locale: job.locale },
  };
}

/**
 * The application form for one job — ported from frontend/src/pages/ApplyPage.tsx.
 * A draft, closed or unknown code is a 404. The form posts to
 * /api/v1/jobs/{code}/applications (lib/api/apply.ts).
 */
export default async function ApplyPage({ params }: Props) {
  const { locale: rawLocale, code } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const job = await loadJob(code, locale);
  if (!job) {
    // An old site link (its job_id in the url) goes to the job's new address.
    await redirectLegacyJob(code, locale, '/apply');
    notFound();
  }

  const tc = await getTranslations('common');

  return (
    // pt-24/28: the page starts below the fixed navbar (like the job page), so the
    // sticky "Back" link rests above the form instead of being pushed onto it.
    <section className={cx('container-page pt-24 pb-14 md:pt-28', s.applyBg, s.applySection)}>
      <div className={s.backWrap}>
        <Link
          href={`/jobs/${encodeURIComponent(job.code)}`}
          className="btn btn-ghost inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {tc('back')}
        </Link>
      </div>

      <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[1fr_360px]">
        <ApplyForm
          job={{ code: job.code, title: job.title, location: job.location }}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        />
        <ApplySidebar job={job} />
      </div>
    </section>
  );
}
