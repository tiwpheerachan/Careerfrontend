'use client';

import {
  ArrowRight,
  Building2,
  ChevronRight,
  Globe2,
  HeartHandshake,
  Sparkles,
  Target,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import styles from './about-hero.module.css';
import { useCountTo, usePrefersReducedMotion } from './hooks';

function StatCard({
  label,
  value,
  suffix,
  icon,
}: {
  label: string;
  value: ReactNode;
  suffix: string;
  icon: ReactNode;
}) {
  return (
    <div className="px-1 py-0">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-700/90">{label}</div>
        <div className="text-slate-700/90">{icon}</div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-black tracking-tight text-slate-950">{value}</div>
        <div className="text-sm font-semibold text-slate-600/80">{suffix}</div>
      </div>
    </div>
  );
}

/** Types `full` one character every `ms` once on mount; shows it whole until typing starts and with reduced motion. */
function useTyped(full: string, ms: number) {
  const reduced = usePrefersReducedMotion();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const timer = window.setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) window.clearInterval(timer);
    }, ms);
    return () => window.clearInterval(timer);
  }, [reduced, full, ms]);

  return reduced ? full : typed || full;
}

/** Moves the hero content up to ±5px with the mouse (none with reduced motion). */
function useMouseParallax() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const tx = ((e.clientX - r.left) / r.width - 0.5) * 10;
      const ty = ((e.clientY - r.top) / r.height - 0.5) * 10;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--hx', `${tx.toFixed(2)}px`);
        el.style.setProperty('--hy', `${ty.toFixed(2)}px`);
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
    };
  }, [reduced]);

  return ref;
}

const badge =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs ring-1 ring-slate-900/10 shadow-xs backdrop-blur-sm';
const chip =
  'inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-slate-900/10 backdrop-blur-sm';

/** The About hero: badges, the typed company name, CTAs, three count-up glass stat cards and chips. */
export function AboutHero() {
  const t = useTranslations('about.hero');
  const parallaxRef = useMouseParallax();
  const companyName = useTyped(t('companyName'), 46);

  const years = useCountTo(12, 820);
  const brands = useCountTo(20, 880);
  const kaStores = useCountTo(1000, 920);

  const stats = [
    {
      label: t('stats.years.label'),
      value: years,
      suffix: t('stats.years.suffix'),
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: t('stats.brands.label'),
      value: `${brands}+`,
      suffix: t('stats.brands.suffix'),
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: t('stats.ka.label'),
      value: `${kaStores}+`,
      suffix: t('stats.ka.suffix'),
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <section className="relative">
      <div
        ref={parallaxRef}
        className={cx('relative will-change-transform', styles.parallax)}
        style={{ transform: 'translate3d(var(--hx,0px), var(--hy,0px), 0)' }}
      >
        <div className="relative mx-auto w-full max-w-[1180px] px-4 pt-14 pb-8 sm:px-6 sm:pt-16 sm:pb-10 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cx(badge, 'bg-white/80 font-extrabold text-slate-900')}>
                  <Sparkles className="h-4 w-4" />
                  {t('badges.companyStory')}
                </span>
                <span className={cx(badge, 'bg-white/75 font-bold text-slate-800')}>
                  <Globe2 className="h-4 w-4" />
                  {t('badges.globalLocalizationGrowth')}
                </span>
                <span className={cx(badge, 'bg-white/75 font-bold text-slate-800')}>
                  <Truck className="h-4 w-4" />
                  {t('badges.omoOperations')}
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight text-[#4b2e1f] sm:text-6xl">
                {companyName}
                <span className="mt-2 block text-2xl font-black tracking-tight text-black sm:text-4xl">
                  {t('headline')}
                </span>
              </h1>

              <p className="mt-4 max-w-[78ch] text-base leading-relaxed text-[#4b2e1f] sm:text-lg sm:leading-7">
                {t('subheadline')}
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/jobs"
                  className={cx(
                    'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black',
                    'bg-slate-950 text-white shadow-[0_18px_70px_rgba(2,6,23,0.22)]',
                    'transition hover:-translate-y-0.5 hover:shadow-[0_28px_110px_rgba(2,6,23,0.26)] active:scale-[0.98]',
                  )}
                >
                  {t('cta.viewJobs')} <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' })}
                  className={cx(
                    'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black',
                    'bg-white/75 text-slate-900 ring-1 shadow-xs ring-slate-900/10 backdrop-blur-sm',
                    'transition hover:-translate-y-0.5 hover:bg-white/85 active:scale-[0.98]',
                  )}
                >
                  {t('cta.readStory')} <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Stats — glass blur (no double frame) */}
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className={cx(
                      'group relative overflow-hidden rounded-3xl p-4',
                      'backdrop-blur-xl',
                      'ring-1 ring-white/45',
                      'shadow-[0_18px_70px_rgba(15,23,42,0.10)]',
                      'transition hover:-translate-y-0.5 hover:shadow-[0_28px_110px_rgba(15,23,42,0.14)]',
                    )}
                  >
                    <div className="pointer-events-none absolute -top-14 -left-10 h-40 w-40 rounded-full bg-white/35 opacity-80 blur-2xl" />
                    <div className="pointer-events-none absolute -right-12 -bottom-16 h-44 w-44 rounded-full bg-white/25 opacity-70 blur-3xl" />
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/20 to-transparent opacity-80" />

                    <div className="relative">
                      <StatCard label={s.label} value={s.value} suffix={s.suffix} icon={s.icon} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                <span className={chip}>
                  <Warehouse className="h-3.5 w-3.5" />
                  {t('chips.warehousing')}
                </span>
                <span className={chip}>
                  <Truck className="h-3.5 w-3.5" />
                  {t('chips.localLogistics')}
                </span>
                <span className={chip}>
                  <HeartHandshake className="h-3.5 w-3.5" />
                  {t('chips.afterSales')}
                </span>
              </div>
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
