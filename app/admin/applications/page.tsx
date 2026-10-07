import { Download, SearchX, Users } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApplicationsTable } from '@/components/admin/applications/applications-table';
import { JobBanner, ListFilters, type JobOption } from '@/components/admin/applications/list-filters';
import { ListPagination } from '@/components/admin/applications/list-pagination';
import { exportHref, listHref, parseListQuery } from '@/components/admin/applications/list-query';
import { ApplicationViewTabs } from '@/components/admin/applications/view-tabs';
import { jobTitle } from '@/components/admin/jobs/job-utils';
import { PageHeader } from '@/components/admin/ui';
import type { AdminLocale } from '@/lib/i18n/admin';
import { store } from '@/lib/store';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';

const exportButton =
  'inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50';

/** /admin/applications — every applicant, filtered, sorted and paged from the url. */
export default async function ApplicationsPage({ searchParams }: PageProps<'/admin/applications'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const query = parseListQuery(await searchParams);
  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('applications.list');

  const filtered = !!(query.q || query.stage || query.jobId);
  const [{ rows, total, stageCounts }, jobs, unfiltered] = await Promise.all([
    store().applications.list({
      q: query.q || undefined,
      stage: query.stage ?? undefined,
      jobId: query.jobId ?? undefined,
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort ?? undefined,
      dir: query.dir ?? undefined,
    }),
    store().jobs.list(),
    // "Showing 3 of 34" needs everyone, counted once more without the search
    // and job (without only a stage, the stage chips already add up to it).
    query.q || query.jobId ? store().applications.list({ page: 1, pageSize: 1 }) : undefined,
  ]);
  const everyone = unfiltered?.total ?? Object.values(stageCounts).reduce((sum, n) => sum + n, 0);

  // Past the last page (a stale link, or rows deleted since): go to the last one.
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  if (query.page > pages) redirect(listHref(query, { page: pages }));

  const jobOptions: JobOption[] = jobs.map((job) => ({
    id: job.id,
    code: job.code,
    title: jobTitle(job, locale),
    applicantCount: job.applicantCount,
  }));
  const jobTitles = new Map(jobOptions.map((j) => [j.id, j.title]));
  const selectedJob = query.jobId ? jobOptions.find((j) => j.id === query.jobId) : undefined;

  return (
    // Inline-size containment: a wide table scrolls inside its card instead of widening the page.
    <div className="[contain:inline-size]">
      <PageHeader
        icon={<Users className="h-5 w-5" />}
        title={t('title')}
        subtitle={filtered ? t('showing', { shown: total, total: everyone }) : t('total', { count: total })}
        actions={
          // CSV export is every applicant's personal data at once: manage only.
          !abilitiesOf(actor).applications.manage ? undefined : total > 0 ? (
            <a href={exportHref(query)} download className={exportButton}>
              <Download className="h-4 w-4" />
              {t('export')}
            </a>
          ) : (
            <button type="button" disabled className={`${exportButton} opacity-50`}>
              <Download className="h-4 w-4" />
              {t('export')}
            </button>
          )
        }
      />

      <ApplicationViewTabs current="applications" />

      <ListFilters query={query} jobs={jobOptions} stageCounts={stageCounts} />

      {query.jobId && <JobBanner query={query} jobTitle={selectedJob ? selectedJob.title : query.jobId} />}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-400">
              <SearchX className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">{t('empty')}</p>
            {filtered && (
              <p className="text-sm text-gray-500">
                {t('emptyHint')} ·{' '}
                <Link
                  href={listHref(query, { q: '', stage: null, jobId: null })}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {t('clearFilter')}
                </Link>
              </p>
            )}
          </div>
        ) : (
          <ApplicationsTable rows={rows} query={query} locale={locale} jobTitles={jobTitles} />
        )}
      </div>

      {total > 0 && <ListPagination query={query} total={total} />}
    </div>
  );
}
