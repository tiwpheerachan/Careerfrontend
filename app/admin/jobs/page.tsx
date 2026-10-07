import { Briefcase, Plus } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { JobsTable, type JobRow } from '@/components/admin/jobs/jobs-table';
import { JobsToolbar } from '@/components/admin/jobs/jobs-toolbar';
import { jobTitle, PUBLISH_STATES, stateFromParam } from '@/components/admin/jobs/job-utils';
import { PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import type { JobPublishState } from '@/lib/constants-types';
import type { AdminLocale } from '@/lib/i18n/admin';
import { store } from '@/lib/store';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';

export async function generateMetadata() {
  const t = await getTranslations('jobs.list');
  const meta = await getTranslations('meta');
  return { title: `${t('title')} · ${meta('title')}` };
}

/**
 * Jobs — ported from the old admin's JobsListPage. The search (?q=) and the
 * status chip (?state=) live in the url and the server does the filtering;
 * sorting is done in the browser (the list is small).
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdminPage({ resource: 'jobs', level: 'view' });
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const publishState = stateFromParam(params.state);
  const t = await getTranslations('jobs.list');
  const locale = (await getLocale()) as AdminLocale;

  const jobs = store().jobs;
  const [all, searched, rows] = await Promise.all([
    jobs.list(),
    q ? jobs.list({ q }) : undefined,
    jobs.list({ q: q || undefined, publishState }),
  ]);

  // The chips count what the search matches, so they say what a click will show.
  const pool = searched ?? all;
  const counts = Object.fromEntries(
    PUBLISH_STATES.map((state) => [state, pool.filter((job) => job.publishState === state).length]),
  ) as Record<JobPublishState, number>;

  const filtered = !!q || !!publishState;
  const tableRows: JobRow[] = rows.map((job) => ({
    id: job.id,
    code: job.code,
    title: jobTitle(job, locale),
    department: job.department,
    level: job.level,
    quantity: job.quantity,
    applicantCount: job.applicantCount,
    publishState: job.publishState,
    updatedAt: job.updatedAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title={t('title')}
        subtitle={
          filtered ? t('showing', { shown: rows.length, total: all.length }) : t('total', { total: all.length })
        }
        actions={
          abilitiesOf(actor).jobs.edit && (
            <Button
              asChild
              className="h-auto rounded-xl px-4 py-2 font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Link href="/admin/jobs/new">
                <Plus className="h-4 w-4" /> {t('create')}
              </Link>
            </Button>
          )
        }
      />

      <JobsToolbar q={q} state={publishState} counts={{ all: pool.length, ...counts }} />

      <JobsTable rows={tableRows} total={all.length} filtered={filtered} />
    </div>
  );
}
