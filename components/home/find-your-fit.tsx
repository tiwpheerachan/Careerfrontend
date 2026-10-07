import { ArrowRight, Briefcase } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';

/** A department and how many open jobs it has; `name` null = jobs without a department. */
export interface DepartmentCount {
  name: string | null;
  count: number;
}

/** The 12 departments with the most open jobs, largest first (ties by name). */
export function topDepartments(departments: Array<string | null>): DepartmentCount[] {
  const counts = new Map<string | null, number>();
  for (const raw of departments) {
    const name = raw?.trim() || null;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || (a.name ?? '').localeCompare(b.name ?? ''))
    .slice(0, 12);
}

export async function FindYourFit({ departments }: { departments: DepartmentCount[] }) {
  const t = await getTranslations('home.findYourFit');

  return (
    <section className="container-page py-16">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div
            className={cx(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
              'border border-[#6f5730]/30 bg-[#6f5730]/10 text-[#6f5730]',
            )}
          >
            <Briefcase className="h-4 w-4" />
            {t('badge')}
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{t('title')}</h2>

          <p className="mt-2 max-w-xl text-sm text-slate-600">{t('desc')}</p>
        </div>

        <Link
          href="/jobs"
          className={cx(
            'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black',
            'bg-[#6f5730] text-white',
            'shadow-[0_16px_50px_rgba(111,87,48,0.35)]',
            'transition hover:-translate-y-0.5 hover:bg-[#5f4a28] active:scale-[0.97]',
          )}
        >
          {t('ctaAllJobs')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {departments.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{t('noJobs')}</div>
        ) : (
          departments.map(({ name, count }) => (
            <Link
              key={name ?? ''}
              href={name ? { pathname: '/jobs', query: { department: name } } : '/jobs'}
              className={cx(
                'group relative overflow-hidden rounded-3xl p-6 text-left',
                'border border-slate-200 bg-white',
                'transition-all duration-300',
                'hover:-translate-y-1 hover:border-[#6f5730]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]',
                'active:scale-[0.98]',
              )}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 bg-linear-to-br from-[#6f5730]/10 via-transparent to-transparent" />
              </div>

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">{name ?? t('otherDepartment')}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {t('card.hiring')} <span className="font-black text-slate-900">{count}</span> {t('card.roleUnit')}
                  </div>
                </div>

                <div
                  className={cx(
                    'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
                    'border border-slate-200 bg-slate-50 text-slate-700',
                    'transition-all duration-300',
                    'group-hover:border-[#6f5730]/40 group-hover:bg-[#6f5730] group-hover:text-white',
                    'group-hover:translate-x-0.5',
                  )}
                >
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="mt-5 text-xs text-slate-500">{t('footnote')}</div>
    </section>
  );
}
