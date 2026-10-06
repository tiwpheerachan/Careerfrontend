import { CheckCircle2, Layers3, Rocket, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

function PillarCard({ icon, title, desc, foot }: { icon: ReactNode; title: string; desc: string; foot: string }) {
  return (
    <div
      className={cx(
        'group relative overflow-hidden rounded-3xl p-6',
        'border border-slate-200 bg-white text-slate-950',
        'shadow-[0_18px_70px_rgba(15,23,42,0.10)]',
        'transition hover:-translate-y-1 hover:shadow-[0_22px_90px_rgba(15,23,42,0.14)]',
      )}
    >
      <div className="pointer-events-none absolute -inset-24 opacity-0 transition duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rotate-12 bg-[radial-gradient(60%_40%_at_50%_50%,rgba(15,23,42,0.08),transparent_60%)]" />
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/5 ring-1 ring-slate-200">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black tracking-wide">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-slate-700">{desc}</div>
        </div>
      </div>

      <div className="relative mt-5 h-px w-full bg-linear-to-r from-transparent via-slate-200 to-transparent" />

      <div className="relative mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <span>{foot}</span>
      </div>
    </div>
  );
}

/** The three pillars (growth, people, resources). Target of the hero's "#pillars" link. */
export function PillarsSection() {
  const t = useTranslations('why.pillars');
  const foot = t('foot');

  return (
    <section id="pillars" className="relative isolate overflow-hidden bg-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_18%,rgba(255,255,255,0.60),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(760px_420px_at_80%_50%,rgba(16,185,129,0.10),transparent_62%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-[1160px]">
          <div className="flex flex-col gap-3 text-center">
            <div className="inline-flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {t('kicker')}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{t('title')}</h2>
            <p className="mx-auto max-w-[70ch] text-sm text-slate-700">{t('subtitle')}</p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <PillarCard
              icon={<Rocket className="h-6 w-6 text-emerald-600" />}
              title={t('cards.growth.title')}
              desc={t('cards.growth.desc')}
              foot={foot}
            />
            <PillarCard
              icon={<Users className="h-6 w-6 text-emerald-600" />}
              title={t('cards.people.title')}
              desc={t('cards.people.desc')}
              foot={foot}
            />
            <PillarCard
              icon={<Layers3 className="h-6 w-6 text-emerald-600" />}
              title={t('cards.resources.title')}
              desc={t('cards.resources.desc')}
              foot={foot}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
