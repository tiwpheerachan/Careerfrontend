'use client';

import { Briefcase, CheckCircle2, ChevronDown, ChevronUp, Code2, FileText, PhoneCall, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cx } from '@/lib/cx';

interface StepText {
  frontTitle: string;
  frontDesc: string;
  bullets: string[];
  backTitle: string;
  backDesc: string;
}

const STEPS = [
  { n: 1, Icon: Sparkles },
  { n: 2, Icon: FileText },
  { n: 3, Icon: PhoneCall },
  { n: 4, Icon: Code2 },
  { n: 5, Icon: Briefcase },
] as const;

/**
 * "Our hiring process": five cards that turn to their detail side on hover
 * (desktop) or tap. Ported from the old JobsPage `HiringProcessCards`.
 */
export function HiringProcess() {
  const t = useTranslations('jobs.hiring');
  const texts = t.raw('steps') as Record<string, StepText>;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="card p-6 md:p-8">
      <div className="text-center">
        <h2 className="text-xl font-black tracking-tight md:text-2xl">{t('title')}</h2>
        <p className="mt-2 text-sm text-slate-600">{t('subtitle')}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        {STEPS.map(({ n, Icon }) => {
          const s = texts[String(n)]!;
          const isOpen = open === n;

          return (
            <button
              key={n}
              type="button"
              onClick={() => setOpen((p) => (p === n ? null : n))}
              className="group relative text-left"
              aria-label={t('ariaStep', { n })}
              aria-expanded={isOpen}
            >
              <div className="relative h-[280px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md focus:outline-hidden focus-visible:ring-4 focus-visible:ring-orange-200/60">
                <div
                  className={cx(
                    'absolute inset-0 p-5 transition duration-300',
                    'md:group-hover:pointer-events-none md:group-hover:translate-y-2 md:group-hover:opacity-0',
                    isOpen
                      ? 'pointer-events-none translate-y-2 opacity-0'
                      : 'pointer-events-auto translate-y-0 opacity-100',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs">
                        <Icon className="h-5 w-5" />
                      </span>
                      {t('stepLabel', { n })}
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 md:hidden" />
                  </div>

                  <div className="mt-4">
                    <div className="text-base leading-snug font-black text-slate-900">{s.frontTitle}</div>
                    <div className="mt-1 text-sm text-slate-600">{s.frontDesc}</div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {s.bullets.slice(0, 3).map((b) => (
                      <div key={b} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <span className="leading-snug">{b}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 text-xs font-semibold text-slate-500">{t('hoverHint')}</div>
                </div>

                <div
                  className={cx(
                    'absolute inset-0 p-5 transition duration-300',
                    'pointer-events-none -translate-y-2 opacity-0',
                    'md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100',
                    isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'md:-translate-y-2 md:opacity-0',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                      {t('detail')}
                    </div>
                    <ChevronUp className="h-4 w-4 text-orange-400 md:hidden" />
                  </div>

                  <div className="mt-4 h-[210px] overflow-auto pr-1">
                    <div className="text-base leading-snug font-black text-slate-900">{s.backTitle}</div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-700">{s.backDesc}</div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <div className="text-xs font-bold text-slate-600">{t('tip')}</div>
                      <div className="mt-1 leading-relaxed">{s.bullets[0]}</div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 text-center text-xs text-slate-500">{t('footerNote')}</div>
    </div>
  );
}
