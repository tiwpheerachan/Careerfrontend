import { ArrowRight, Briefcase, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { getImageProps } from 'next/image';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import { SpotlightSection } from './spotlight-section';

const HERO_BG_DESKTOP = '/images/5_07_Charge_Faster_Clean_Longer_1200x.webp';
const HERO_BG_MOBILE = '/images/hero/mobile/hero-1.webp';

function Feature({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div>
        <div>
          <div className="text-sm font-black text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600">{desc}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * One background per device: the portrait image below 640px, the wide one
 * above — a <picture>, so the browser downloads only the one it shows. It is
 * the page's LCP, so it loads eagerly with high priority.
 */
function HeroBackground() {
  const common = { alt: '', fill: true, sizes: '100vw', loading: 'eager', fetchPriority: 'high' } as const;
  const { props: mobile } = getImageProps({ ...common, src: HERO_BG_MOBILE });
  const { props: desktop } = getImageProps({ ...common, src: HERO_BG_DESKTOP });
  return (
    <picture>
      <source media="(max-width: 639px)" srcSet={mobile.srcSet} sizes={mobile.sizes} />
      <img {...desktop} alt="" className="absolute inset-0 h-full w-full scale-[1.03] object-cover" draggable={false} />
    </picture>
  );
}

export async function Hero({ openings }: { openings: number }) {
  const t = await getTranslations('home');

  const glassChip = 'inline-flex items-center gap-1 rounded-full border  bg-white/10 px-3 py-1.5 backdrop-blur-sm';

  return (
    <SpotlightSection className="group relative isolate overflow-hidden bg-slate-950">
      {/* FULL-BLEED BACKGROUND */}
      <div className="absolute inset-0">
        <HeroBackground />

        {/* overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(700px_360px_at_50%_30%,rgba(255,215,120,0.22),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_35%,rgba(255,170,150,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_18%_22%,rgba(255,255,255,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_76%_18%,rgba(56,189,248,0.22),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_78%_70%,rgba(168,85,247,0.20),transparent_62%)]" />

        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
      </div>

      {/* MOUSE SPOTLIGHT */}
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background:
            'radial-gradient(520px 360px at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.14), rgba(255,255,255,0.06) 40%, transparent 70%)',
        }}
      />

      {/* CONTENT */}
      <div className="container-page relative py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[920px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border  bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_28px_rgba(52,211,153,0.65)]" />
            {t('brandBadge')}
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t('headline')}
          </h1>

          {/* sm:leading-7 = the old v3 result, where sm:text-lg's own line height beat leading-relaxed */}
          <p className="mx-auto mt-4 max-w-[70ch] text-base leading-relaxed text-white/80 sm:text-lg sm:leading-7">
            {t('subhead')}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black',
                'bg-white text-slate-950 shadow-[0_22px_70px_rgba(0,0,0,0.40)]',
                'transition hover:-translate-y-0.5 hover:shadow-[0_30px_110px_rgba(0,0,0,0.48)]',
              )}
            >
              {t('ctaPrimary')} <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/why-shd"
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black',
                'border  bg-white/10 text-white backdrop-blur-sm',
                'transition  hover:-translate-y-0.5',
              )}
            >
              {t('ctaSecondary')}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/75">
            <span className={glassChip}>
              <Briefcase className="h-3.5 w-3.5" />
              {t('chips.openings', { count: openings })}
            </span>
            <span className={glassChip}>
              <Globe2 className="h-3.5 w-3.5" />
              {t('chips.regions')}
            </span>
            <span className={glassChip}>
              <Sparkles className="h-3.5 w-3.5" />
              {t('chips.experience')}
            </span>
          </div>

          <p className="mt-5 text-xs text-white/55">{t('bannerNote')}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<Globe2 className="h-5 w-5" />}
            title={t('features.multiCountry.title')}
            desc={t('features.multiCountry.desc')}
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title={t('features.languages.title')}
            desc={t('features.languages.desc')}
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t('features.professional.title')}
            desc={t('features.professional.desc')}
          />
          <Feature
            icon={<Briefcase className="h-5 w-5" />}
            title={t('features.structured.title')}
            desc={t('features.structured.desc')}
          />
        </div>
      </div>
    </SpotlightSection>
  );
}
