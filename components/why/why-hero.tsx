import { ArrowRight, Layers3, Rocket, Sparkles, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getImageProps } from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { cx } from '@/lib/cx';
import { SpotlightSection } from './spotlight-section';

const HERO_BG_DESKTOP = '/images/why/why-hero.jpg';
const HERO_BG_MOBILE = '/images/hero/mobile/herowhy.webp';

/**
 * Hero background: a wide photo from 640px up, a portrait one on phones.
 * One <picture>, so the browser downloads only the one it shows.
 */
function HeroBackground() {
  const common = { alt: '', sizes: '100vw', loading: 'eager' as const, fetchPriority: 'high' as const };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: HERO_BG_DESKTOP, width: 1920, height: 691 });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: HERO_BG_MOBILE, width: 895, height: 1129 });

  return (
    <picture>
      <source media="(min-width: 640px)" srcSet={desktop} />
      <source srcSet={mobile} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- next/image's props, art-directed via <picture> */}
      <img
        {...rest}
        className="absolute inset-0 h-full w-full scale-[1.03] object-cover object-center will-change-transform"
      />
    </picture>
  );
}

export function WhyHero() {
  const t = useTranslations('why.hero');

  return (
    <SpotlightSection className="group relative isolate overflow-hidden bg-white">
      <div className="absolute inset-0">
        <HeroBackground />

        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_25%_18%,rgba(255,255,255,0.24),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_420px_at_75%_28%,rgba(16,185,129,0.14),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_70%_78%,rgba(168,85,247,0.14),transparent_62%)]" />

        <div
          className={cx(
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300',
            'group-hover:opacity-100',
          )}
          style={{
            background:
              'radial-gradient(560px 380px at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.20), rgba(255,255,255,0.08) 42%, transparent 72%)',
          }}
        />

        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/35 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[1040px] text-center text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/95 backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            {t('kicker')}
          </div>

          <h1 className="mt-6 text-[28px] font-black tracking-tight sm:text-5xl lg:text-6xl">{t('title')}</h1>

          {/* sm:leading-7: Tailwind 3's sm:text-lg also reset the line height to 1.75rem; v4 keeps leading-relaxed. */}
          <p className="mx-auto mt-4 max-w-[70ch] text-[15px] leading-relaxed text-white/90 sm:text-lg sm:leading-7">
            {t('subtitle')}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className={cx(
                'inline-flex w-full max-w-[360px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black',
                'bg-white text-slate-950 shadow-[0_24px_80px_rgba(0,0,0,0.35)]',
                'transition hover:-translate-y-0.5 hover:shadow-[0_34px_120px_rgba(0,0,0,0.40)] active:scale-[0.98]',
                'sm:w-auto',
              )}
            >
              {t('ctaPrimary')} <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#pillars"
              className={cx(
                'inline-flex w-full max-w-[360px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black',
                'border border-white/25 bg-white/10 text-white backdrop-blur-sm',
                'transition  hover:-translate-y-0.5 active:scale-[0.98]',
                'sm:w-auto',
              )}
            >
              {t('ctaSecondary')}
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-white/90">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Rocket className="h-3.5 w-3.5" />
              {t('chips.growth')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Users className="h-3.5 w-3.5" />
              {t('chips.people')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <Layers3 className="h-3.5 w-3.5" />
              {t('chips.resources')}
            </span>
          </div>
        </div>
      </div>
    </SpotlightSection>
  );
}
