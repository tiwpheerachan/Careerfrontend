import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FaqTabs } from '@/components/jobs/faq-tabs';
import { HiringProcess } from '@/components/jobs/hiring-process';
import { JobCard } from '@/components/jobs/job-card';
import { JobsHero } from '@/components/jobs/jobs-hero';
import { JobsNavProvider, ListTop, WhenSettled } from '@/components/jobs/jobs-nav';
import { JobsPager } from '@/components/jobs/jobs-pager';
import { PAGE_SIZE, parseJobsQuery } from '@/components/jobs/jobs-query';
import type { Locale } from '@/lib/i18n/routing';
import { store } from '@/lib/store';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const hero = await getTranslations({ locale, namespace: 'jobs.hero' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const title = nav('jobs');
  const description = hero('subtitle');
  return {
    title,
    description,
    openGraph: { title: `${title} · ${meta('title')}`, description, type: 'website', locale },
  };
}

/**
 * Open positions — ported from frontend/src/pages/JobsPage.tsx. The filters,
 * search and page live in the url and the server does the filtering, so every
 * result page is a real, shareable url.
 */
export default async function JobsPage({ params, searchParams }: Props) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const query = parseJobsQuery(await searchParams);

  const t = await getTranslations('jobs.list');
  const tc = await getTranslations('common');
  const [jobs, facets] = await Promise.all([
    store().jobs.listPublic({
      locale,
      q: query.q || undefined,
      countryCode: query.country || undefined,
      department: query.department || undefined,
      level: query.level || undefined,
    }),
    store().jobs.publicFacets(),
  ]);

  const totalPages = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const pagedJobs = jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <JobsNavProvider query={{ ...query, page }}>
      <section className="bg-white">
        <JobsHero total={jobs.length} facets={facets} />

        <div className="container-page py-10">
          <ListTop className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{t('title')}</h2>
                <div className="mt-1 text-sm text-slate-600">
                  <WhenSettled fallback={tc('loading')}>
                    {t('subtitle', { count: jobs.length, perPage: PAGE_SIZE })}
                  </WhenSettled>
                </div>
              </div>

              <JobsPager totalPages={totalPages} className="mt-2 md:mt-0" />
            </div>
          </ListTop>

          <div className="mt-4">
            <WhenSettled
              fallback={
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="text-sm text-slate-600">{tc('loading')}</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                </div>
              }
            >
              {jobs.length === 0 ? (
                <div className="card p-6 text-sm text-slate-600">{t('empty')}</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pagedJobs.map((job) => (
                      <JobCard key={job.code} job={job} locale={locale} />
                    ))}
                  </div>
                  <JobsPager totalPages={totalPages} className="mt-8" />
                </>
              )}
            </WhenSettled>
          </div>

          <div className="mt-10">
            <HiringProcess />
          </div>

          <div className="mt-8">
            <FaqTabs />
          </div>
        </div>
      </section>
    </JobsNavProvider>
  );
}
