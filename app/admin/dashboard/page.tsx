import { AlertTriangle, ArrowRight, Briefcase, LayoutDashboard, Target, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { BarList, Sparkbars } from '@/components/admin/charts';
import { Kpi } from '@/components/admin/dashboard/kpi';
import { jobTitle, stateToParam } from '@/components/admin/jobs/job-utils';
import { PageHeader, Panel, STAGE_TONE, ToneBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/admin/format';
import type { ApplicationStage } from '@/lib/constants-types';
import { intlLocale, type AdminLocale } from '@/lib/i18n/admin';
import { store } from '@/lib/store';
import { requireAdminPage } from '@/lib/auth/admin';

const DAYS = 30;
const TOP = 8;
const STAGES: ApplicationStage[] = ['NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'];

/**
 * The overview (the old DashboardPage): headline numbers, the last 30 days,
 * the stage breakdown, the top jobs / departments / source channels, and the
 * open jobs nobody has applied to. Every number counts every row.
 */
export default async function DashboardPage() {
  await requireAdminPage({ resource: 'applications', level: 'view' });
  const locale = (await getLocale()) as AdminLocale;
  const [t, tStage, tCommon, a, jobs] = await Promise.all([
    getTranslations('dashboard'),
    getTranslations('stage'),
    getTranslations('common'),
    store().applications.analytics({ days: DAYS, timeZone: 'Asia/Bangkok' }),
    store().jobs.list(),
  ]);
  // Jobs named as everywhere else in the admin: the admin's language first (the analytics carry the Thai title).
  const titles = new Map(jobs.map((job) => [job.id, jobTitle(job, locale)]));
  const titleOf = (job: { id: string; code: string; title: string | null }) => {
    const title = titles.get(job.id);
    // jobTitle ends on the code; here a job without any title says so.
    return title && title !== job.code ? title : job.title;
  };

  const number = new Intl.NumberFormat(intlLocale(locale));
  const periodTotal = a.daily.reduce((sum, d) => sum + d.count, 0);
  const first = a.daily[0]?.date;
  const last = a.daily.at(-1)?.date;
  const nameOf = (name: string | null) => name ?? t('notSpecified');

  return (
    <div>
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Button
            asChild
            variant="outline"
            className="h-auto rounded-xl border-gray-200 bg-white px-4 py-2 text-gray-900 hover:bg-gray-50"
          >
            <Link href="/admin/applications">
              {t('allApplicants')} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            icon={<Users className="h-5 w-5 text-blue-700" />}
            tone="bg-blue-50"
            label={t('kpi.applications')}
            value={number.format(a.totals.applications)}
            href="/admin/applications"
          />
          <Kpi
            icon={<Briefcase className="h-5 w-5 text-indigo-700" />}
            tone="bg-indigo-50"
            label={t('kpi.publishedJobs')}
            value={number.format(a.totals.publishedJobs)}
            href={`/admin/jobs?state=${stateToParam('PUBLISHED')}`}
          />
          <Kpi
            icon={<Target className="h-5 w-5 text-emerald-700" />}
            tone="bg-emerald-50"
            label={t('kpi.hireRate')}
            value={`${Math.round(a.totals.hireRate * 100)}%`}
          />
          <Kpi
            icon={<TrendingUp className="h-5 w-5 text-violet-700" />}
            tone="bg-violet-50"
            label={t('kpi.avgPerJob')}
            value={number.format(a.totals.avgPerPublishedJob)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            className="lg:col-span-2"
            title={t('trend.title', { days: DAYS })}
            subtitle={t('trend.subtitle', { count: number.format(periodTotal) })}
            right={<ToneBadge tone="blue">{t('trend.badge', { days: DAYS })}</ToneBadge>}
          >
            <Sparkbars data={a.daily} />
            <div className="mt-2 flex justify-between gap-2 text-[11px] text-gray-400">
              <span>{formatDate(first, locale)}</span>
              <span>
                {t('trend.today')} · {formatDate(last, locale)}
              </span>
            </div>
          </Panel>

          <Panel title={t('byStage.title')} subtitle={t('byStage.subtitle')}>
            <div className="space-y-2">
              {STAGES.map((stage) => (
                <Link
                  key={stage}
                  href={`/admin/applications?stage=${stage}`}
                  className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-gray-50"
                >
                  <ToneBadge tone={STAGE_TONE[stage]}>{tStage(stage)}</ToneBadge>
                  <span className="text-lg font-black text-gray-900">{number.format(a.byStage[stage] ?? 0)}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title={t('topJobs.title')} subtitle={t('topJobs.subtitle')}>
            <BarList
              emptyText={tCommon('noData')}
              items={a.byJob.slice(0, TOP).map((job) => ({
                label: titleOf(job) ?? job.code,
                value: job.count,
                sublabel: job.code,
                href: `/admin/applications?jobId=${encodeURIComponent(job.id)}`,
              }))}
            />
          </Panel>

          <Panel title={t('byDepartment.title')} subtitle={t('byDepartment.subtitle')}>
            <BarList
              emptyText={tCommon('noData')}
              items={a.byDepartment.slice(0, TOP).map((d) => ({ label: nameOf(d.name), value: d.count }))}
            />
          </Panel>

          <Panel title={t('bySource.title')} subtitle={t('bySource.subtitle')}>
            <BarList
              emptyText={tCommon('noData')}
              items={a.bySource.slice(0, TOP).map((s) => ({ label: nameOf(s.name), value: s.count }))}
            />
          </Panel>
        </div>

        {a.publishedWithoutApplicants.length > 0 && (
          <Panel
            title={t('zeroJobs.title')}
            subtitle={t('zeroJobs.subtitle')}
            right={
              <ToneBadge tone="amber">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {a.publishedWithoutApplicants.length}
              </ToneBadge>
            }
          >
            <div className="flex flex-wrap gap-2">
              {a.publishedWithoutApplicants.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs/${encodeURIComponent(job.id)}`}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-amber-300 hover:bg-amber-50"
                >
                  {titleOf(job) ?? t('untitled')} <span className="text-xs text-gray-400">· {job.code}</span>
                </Link>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
