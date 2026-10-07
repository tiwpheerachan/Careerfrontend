'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type KeyboardEvent } from 'react';
import { cx } from '@/lib/cx';
import { usePrefersReducedMotion } from './hooks';

export type JourneyItem = { year: string; title: string; desc: string; tag?: string };

const EMPTY: JourneyItem[] = [{ year: '—', title: '—', desc: '—', tag: '—' }];

/**
 * The journey stepper: labelled steps on a gradient progress rail, the active
 * milestone, and the year column with up/down. ArrowUp/ArrowDown step through
 * it only while the stepper has focus (the old one captured them for the
 * whole page, so the arrow keys no longer scrolled).
 */
export function JourneyShowcase({ items }: { items: JourneyItem[] }) {
  const t = useTranslations('about.journey');
  const reduced = usePrefersReducedMotion();
  const steps = items.length ? items : EMPTY;

  const [idx, setIdx] = useState(0);
  const active = steps[idx]!;
  const canPrev = idx > 0;
  const canNext = idx < steps.length - 1;

  const prev = () => setIdx((v) => Math.max(0, v - 1));
  const next = () => setIdx((v) => Math.min(steps.length - 1, v + 1));

  const labels = steps.map((x) => x.tag || x.year);
  const progress = steps.length <= 1 ? 0 : (idx / (steps.length - 1)) * 100;
  const yearAt = (i: number) => steps[i]?.year ?? '—';

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      prev();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      next();
    }
  };

  return (
    <div className="mt-8" role="group" aria-label={t('a11y.stepper')} tabIndex={0} onKeyDown={onKeyDown}>
      <div className="mx-auto w-full max-w-[980px]">
        {/* Step bar */}
        <div className="px-2 sm:px-6">
          <div className="relative">
            {/* Each label sits over its dot (the dots are spread edge to edge below):
                the first starts at the left edge, the last ends at the right one. */}
            <div className="relative h-5 text-[12px] sm:h-6 sm:text-sm">
              {labels.map((label, i) => {
                const last = steps.length - 1;
                const at = last > 0 ? (i / last) * 100 : 0;
                const shift = i === 0 ? '0' : i === last ? '-100%' : '-50%';
                return (
                  <button
                    key={`${label}-${i}`}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={cx(
                      'absolute top-0 whitespace-nowrap transition',
                      i === idx ? 'font-semibold text-slate-950' : 'text-slate-500 hover:text-slate-700',
                    )}
                    style={{ left: `${at}%`, transform: `translateX(${shift})` }}
                    aria-current={i === idx ? 'step' : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* rail */}
            <div className="relative mt-2 h-8">
              <div className="absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full bg-slate-200" />
              <div
                className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(245,158,11,0.95), rgba(236,72,153,0.42))',
                }}
              />

              <div className="absolute inset-0 flex items-center justify-between">
                {steps.map((_, i) => {
                  const activeDot = i === idx;
                  return (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={cx(
                        'relative grid place-items-center rounded-full transition',
                        activeDot ? 'scale-110' : 'hover:scale-105',
                      )}
                      aria-label={t('a11y.goTo', { label: labels[i] ?? '' })}
                    >
                      <span
                        className={cx(
                          'block h-3.5 w-3.5 rounded-full',
                          activeDot ? 'bg-amber-500 shadow-[0_10px_24px_rgba(245,158,11,0.35)]' : 'bg-amber-500/85',
                        )}
                      />
                      {activeDot ? (
                        <span className="pointer-events-none absolute -inset-3 rounded-full bg-amber-500/10" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* content */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_220px]">
          <div className="px-2 sm:px-6">
            {active.tag ? (
              <div className="mb-4">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-5 py-2 text-sm font-semibold text-amber-900">
                  {active.tag}
                </span>
              </div>
            ) : null}

            <div
              className={cx('transition', reduced ? '' : 'will-change-transform')}
              style={{ transform: reduced ? undefined : 'translateZ(0)' }}
            >
              <h3 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{active.title}</h3>

              <p className="mt-5 max-w-[68ch] text-base leading-relaxed text-slate-700 sm:text-lg sm:leading-7">
                {active.desc}
              </p>

              <div className="mt-6">
                <span className="inline-flex items-center rounded-full bg-fuchsia-100/80 px-5 py-2 text-sm font-semibold text-slate-900">
                  {t('motto')}
                </span>
              </div>
            </div>
          </div>

          <div className="px-2 sm:px-6 lg:px-0">
            <div className="mx-auto w-full max-w-[220px]">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={prev}
                  disabled={!canPrev}
                  className={cx(
                    'grid h-11 w-11 place-items-center rounded-2xl transition',
                    canPrev ? 'hover:bg-slate-900/5 active:scale-[0.98]' : 'cursor-not-allowed opacity-30',
                  )}
                  aria-label={t('a11y.prev')}
                >
                  <ChevronUp className="h-7 w-7 text-slate-900" />
                </button>

                <div className="mt-1 text-center">
                  <div className="text-xl font-semibold text-slate-400">{yearAt(idx - 1)}</div>
                  <div className="mt-2 text-6xl font-black tracking-tight text-slate-950">{active.year}</div>
                  <div className="mt-2 text-xl font-semibold text-slate-300">{yearAt(idx + 1)}</div>
                </div>

                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext}
                  className={cx(
                    'mt-3 grid h-11 w-11 place-items-center rounded-2xl transition',
                    canNext ? 'hover:bg-slate-900/5 active:scale-[0.98]' : 'cursor-not-allowed opacity-30',
                  )}
                  aria-label={t('a11y.next')}
                >
                  <ChevronDown className="h-7 w-7 text-slate-900" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
