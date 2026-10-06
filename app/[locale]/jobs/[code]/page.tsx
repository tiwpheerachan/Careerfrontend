import { BadgeCheck, Briefcase, Building2, Globe2, Hash, Layers3, MapPin, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cache, type ReactNode } from 'react';
import { BackButton } from '@/components/jobs/detail/back-button';
import { RecCard } from '@/components/jobs/detail/rec-card';
import { recommendJobs } from '@/components/jobs/detail/recommend';
import { countryName } from '@/lib/countries';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { PublicJob } from '@/lib/repositories/jobs';
import { store } from '@/lib/store';

type Props = { params: Promise<{ locale: string; code: string }> };

/** One query per request, shared by generateMetadata and the page. */
const loadJob = cache((code: string, locale: Locale) => store().jobs.getPublic(code, locale));

/** The job's own text, flattened to one line, for meta descriptions. */
function summary(job: PublicJob, max = 160): string {
  const text = (job.description || job.qualifications || job.title).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  const job = await loadJob(code, locale as Locale);
  if (!job) return {};
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const description = summary(job);
  return {
    title: job.title,
    description,
    openGraph: {
      title: `${job.title} · ${meta('title')}`,
      description,
      type: 'website',
      locale: job.locale,
    },
  };
}

/**
 * One job — ported from frontend/src/pages/JobDetailPage.tsx. A draft, closed
 * or unknown code is a 404. The job text is plain text with line breaks.
 */
export default async function JobDetailPage({ params }: Props) {
  const { locale: rawLocale, code } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const job = await loadJob(code, locale);
  if (!job) notFound();

  const t = await getTranslations('jobs.detail');
  const tc = await getTranslations('common');
  const nav = await getTranslations('nav');
  const all = await store().jobs.listPublic({ locale });
  const recommended = recommendJobs(job, all);
  const applyHref = `/jobs/${encodeURIComponent(job.code)}/apply`;
  const country = countryName(job.countryCode, locale);
  // The text may be in another language than the page when this one has no translation.
  const textLang = job.locale !== locale ? job.locale : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: [job.description, job.qualifications].filter(Boolean).join('\n\n') || job.title,
    identifier: { '@type': 'PropertyValue', name: 'SHD Technology', value: job.code },
    ...(job.publishedAt ? { datePosted: job.publishedAt.toISOString() } : {}),
    hiringOrganization: { '@type': 'Organization', name: 'SHD Technology' },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: job.countryCode,
        ...(job.location ? { addressLocality: job.location } : {}),
      },
    },
    ...(job.quantity ? { totalJobOpenings: job.quantity } : {}),
  };

  return (
    <section className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="container-page pt-24 pb-16 md:pt-28">
        {/* Top bar: back + job id */}
        <div className={cx('sticky top-[72px] z-60 -mx-2 px-2', 'md:top-[84px]')}>
          <div
            className={cx(
              'flex items-center justify-between gap-3',
              'rounded-2xl border border-slate-200',
              'px-3 py-2 shadow-[0_18px_60px_rgba(2,6,23,0.08)] backdrop-blur-sm',
            )}
          >
            <BackButton />
            <div className="hidden items-center gap-2 text-xs font-semibold text-slate-500 sm:flex">
              <Hash className="h-4 w-4" />
              <span className="text-slate-600">{job.code}</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_26px_90px_rgba(2,6,23,0.08)]">
          <div
            className="relative px-6 py-6 md:px-8 md:py-8"
            style={{
              background:
                'radial-gradient(1200px 420px at 12% 10%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(900px 360px at 92% 0%, rgba(249,115,22,0.10), transparent 55%)',
            }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
              <Sparkles className="h-4 w-4" />
              {nav('jobs')}
            </div>

            <h1 lang={textLang} className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
              {job.title}
            </h1>

            <div className="mt-4 flex flex-wrap gap-2">
              {job.department && <Pill icon={<Building2 className="h-4 w-4" />}>{job.department}</Pill>}
              {job.level && <Pill icon={<Layers3 className="h-4 w-4" />}>{job.level}</Pill>}
              {job.location && <Pill icon={<MapPin className="h-4 w-4" />}>{job.location}</Pill>}
              <Pill icon={<Globe2 className="h-4 w-4" />}>{country}</Pill>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(2,6,23,0.06)] md:p-8">
              <Section
                title={t('description')}
                body={job.description}
                lang={textLang}
                icon={<BadgeCheck className="h-4 w-4" />}
              />
              <Section
                title={t('qualifications')}
                body={job.qualifications}
                lang={textLang}
                icon={<Sparkles className="h-4 w-4" />}
              />
            </div>

            {/* Desktop: apply card + facts */}
            <aside className="hidden space-y-4 lg:sticky lg:top-28 lg:block lg:self-start">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(2,6,23,0.06)]">
                <div className="text-sm font-black text-slate-900">{tc('applyNow')}</div>
                <div className="mt-2 text-sm leading-relaxed text-slate-600">{t('applyBlurb')}</div>

                <div className="mt-4">
                  <Link
                    href={applyHref}
                    className={cx(
                      'inline-flex w-full items-center justify-center gap-2',
                      'rounded-2xl px-4 py-3 text-sm font-extrabold',
                      'bg-blue-600 text-white shadow-[0_18px_50px_rgba(37,99,235,0.32)]',
                      'transition hover:bg-blue-700 active:bg-blue-800',
                      'hover:-translate-y-0.5 active:translate-y-0',
                      'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-orange-200/60',
                    )}
                  >
                    <Briefcase className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                    {tc('applyNow')}
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(2,6,23,0.06)]">
                <div className="text-xs font-semibold text-slate-500">{t('jobId')}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{job.code}</div>
                <div className="mt-4 text-xs font-semibold text-slate-500">{tc('country')}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{country}</div>
              </div>
            </aside>
          </div>

          {recommended.length > 0 && (
            <section className="mt-10">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <Sparkles className="h-4 w-4" />
                    {t('recommendedBadge')}
                  </div>
                  <h2 className="mt-2 text-lg font-black tracking-tight text-slate-900 md:text-xl">
                    {t('recommendedTitle')}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{t('recommendedSubtitle')}</p>
                </div>

                <Link
                  href="/jobs"
                  className={cx(
                    'hidden items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold sm:inline-flex',
                    'border border-slate-200 bg-white text-slate-800',
                    'transition hover:bg-slate-50 active:bg-slate-100',
                  )}
                >
                  {t('viewAll')}
                </Link>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {recommended.map((j) => (
                  <RecCard key={j.code} job={j} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Phones and tablets: apply bar fixed at the bottom */}
      <div className="lg:hidden">
        <div className="fixed inset-x-0 bottom-0 z-70">
          <div className="mx-auto w-full max-w-[1280px] px-4 pb-4">
            <div
              className={cx(
                'rounded-3xl border border-slate-200',
                'shadow-[0_30px_90px_rgba(2,6,23,0.18)] backdrop-blur-sm',
                'p-3',
              )}
            >
              <Link
                href={applyHref}
                className={cx(
                  'inline-flex w-full items-center justify-center gap-2',
                  'rounded-2xl px-4 py-3 text-sm font-extrabold',
                  'bg-blue-600 text-white',
                  'transition hover:bg-blue-700 active:bg-blue-800',
                  'hover:-translate-y-0.5 active:translate-y-0',
                  'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-orange-200/60',
                )}
              >
                <Briefcase className="h-5 w-5" />
                {tc('applyNow')}
              </Link>

              <div className="mt-2 text-center text-xs text-slate-500">{t('applyBlurbShort')}</div>
            </div>
          </div>
        </div>

        <div className="h-[108px]" />
      </div>
    </section>
  );
}

function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 rounded-full',
        'border border-slate-200 bg-white/90 px-3 py-1.5',
        'text-xs font-semibold text-slate-700',
        'shadow-[0_12px_30px_rgba(2,6,23,0.06)] backdrop-blur-sm',
      )}
    >
      <span className="text-slate-600">{icon}</span>
      <span className="leading-none">{children}</span>
    </span>
  );
}

function Section({ title, body, icon, lang }: { title: string; body: string | null; icon: ReactNode; lang?: string }) {
  if (!body?.trim()) return null;
  return (
    <section className="mt-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
          {icon}
        </span>
        <h2 className="text-sm font-black tracking-tight text-slate-900">{title}</h2>
      </div>

      <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-5">
        <div lang={lang} className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
          {body}
        </div>
      </div>
    </section>
  );
}
