import { useTranslations } from 'next-intl';
import { cx } from '@/lib/cx';
import s from './apply.module.css';

/** The right-hand column: the job, tips (the file rules the server enforces) and the privacy note. */
export function ApplySidebar({ job }: { job: { title: string; location: string | null; department: string | null } }) {
  const t = useTranslations('apply');
  const tf = useTranslations('jobs.form');
  const tc = useTranslations('common');

  return (
    <aside className="space-y-4">
      <div className={cx(s.glassCard, 'rounded-3xl p-6')}>
        <div className="text-xs font-semibold text-slate-500">{t('sidebar.job')}</div>
        <div className="mt-1 text-base font-black text-slate-900">{job.title}</div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="text-xs font-semibold text-slate-500">{tc('location')}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{job.location ?? '—'}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="text-xs font-semibold text-slate-500">{tc('department')}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{job.department ?? '—'}</div>
          </div>
        </div>

        <div className={cx('mt-5', s.softHr)} />

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <div className="text-sm font-black text-slate-900">{tf('tipsTitle')}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>{tf('tipsResume')}</li>
            <li>{tf('tipsAttachments')}</li>
            <li>{tf('tipsSkills')}</li>
            <li>{t('sidebar.tipMonths')}</li>
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/70 p-5">
        <div className="text-sm font-black text-slate-900">{t('sidebar.privacyTitle')}</div>
        <div className="mt-2 text-sm text-slate-600">{t('sidebar.privacyBody')}</div>
      </div>
    </aside>
  );
}
