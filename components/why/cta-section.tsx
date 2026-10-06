import { ArrowRight, Layers3, Rocket, Sparkles, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { cx } from '@/lib/cx';

export function CtaSection() {
  const t = useTranslations('why.cta');

  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_35%,rgba(255,255,255,0.62),transparent_62%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1040px] overflow-hidden rounded-[28px] p-7 text-center text-slate-950 shadow-[0_30px_140px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 backdrop-blur-xl sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-900">
            <Sparkles className="h-4 w-4" />
            {t('kicker')}
          </div>

          <h3 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('title')}</h3>
          <p className="mx-auto mt-3 max-w-[70ch] text-sm text-slate-700 sm:text-base">{t('subtitle')}</p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className={cx(
                'inline-flex w-full max-w-[380px] items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black',
                'bg-slate-950 text-white',
                'shadow-[0_24px_80px_rgba(15,23,42,0.25)]',
                'transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(15,23,42,0.30)] active:scale-[0.98]',
                'sm:w-auto',
              )}
            >
              {t('ctaPrimary')} <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#pillars"
              className={cx(
                'inline-flex w-full max-w-[380px] items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black',
                'border border-slate-200 bg-white text-slate-900',
                'transition hover:-translate-y-0.5 active:scale-[0.98]',
                'sm:w-auto',
              )}
            >
              {t('ctaSecondary')}
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-700">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <Rocket className="h-3.5 w-3.5" />
              {t('chips.growthFirst')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              {t('chips.greatTeams')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5">
              <Layers3 className="h-3.5 w-3.5" />
              {t('chips.realResources')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
