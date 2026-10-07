import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import s from '@/components/apply/apply.module.css';
import { ApplicationFormWizard } from '@/components/application-form/wizard';
import { cx } from '@/lib/cx';
import type { Locale } from '@/lib/i18n/routing';
import { store } from '@/lib/store';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'applicationForm' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const title = t('metaTitle');
  const description = t('metaDescription');
  return {
    title,
    description,
    openGraph: { title: `${title} · ${meta('title')}`, description, type: 'website', locale },
  };
}

/**
 * The company's paper application form (ใบสมัครงาน), filled in online — one
 * section at a time (components/application-form). The published jobs are
 * offered as positions, in the visitor's language.
 */
export default async function ApplicationFormPage({ params }: Props) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const jobs = await store().jobs.listPublic({ locale });

  return (
    <section className={cx('container-page pt-24 pb-14 sm:pt-28', s.applyBg, s.applySection)}>
      <div className="mx-auto max-w-3xl">
        <ApplicationFormWizard
          jobs={jobs.map((job) => ({ code: job.code, title: job.title, countryCode: job.countryCode }))}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined}
        />
      </div>
    </section>
  );
}
