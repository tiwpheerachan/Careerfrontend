import { Building2, Globe2, Hash, Layers3, MapPin, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { countryName } from '@/lib/countries';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { PublicJob } from '@/lib/repositories/jobs';

/** A "similar opening" card under a job's detail — the old JobDetailPage `RecCard`. */
export function RecCard({ job, locale }: { job: PublicJob; locale: Locale }) {
  const t = useTranslations('jobs.detail');

  return (
    <Link
      href={`/jobs/${encodeURIComponent(job.code)}`}
      className={cx(
        'group block overflow-hidden rounded-3xl border border-slate-200 bg-white p-5',
        'shadow-[0_12px_40px_rgba(2,6,23,0.06)]',
        'transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_70px_rgba(2,6,23,0.10)]',
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-orange-200/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-black text-slate-900">{job.title}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3.5 w-3.5" />
              {job.code}
            </span>
          </div>
        </div>

        <span
          className={cx(
            'inline-flex shrink-0 items-center gap-1 rounded-full',
            'border border-slate-200 bg-slate-50 px-2.5 py-1',
            'text-[11px] font-bold text-slate-700',
            'group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-700',
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t('match')}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <Row icon={<Building2 className="h-3.5 w-3.5" />} iconClass="bg-blue-600 text-white" text={job.department} />
        <Row icon={<Layers3 className="h-3.5 w-3.5" />} iconClass="bg-amber-500 text-white" text={job.level} />
        <Row
          icon={<MapPin className="h-3.5 w-3.5" />}
          iconClass="bg-white text-slate-600 ring-1 ring-slate-200"
          text={job.location}
        />
        <Row
          icon={<Globe2 className="h-3.5 w-3.5" />}
          iconClass="bg-emerald-600 text-white"
          text={countryName(job.countryCode, locale)}
        />
      </div>

      <div className="mt-4 text-xs font-semibold text-slate-500">{t('clickToView')}</div>
    </Link>
  );
}

function Row({ icon, iconClass, text }: { icon: ReactNode; iconClass: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-700">
      <span className={cx('inline-flex h-7 w-7 items-center justify-center rounded-full', iconClass)}>{icon}</span>
      <span className="truncate font-semibold">{text}</span>
    </div>
  );
}
