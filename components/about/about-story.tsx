import { Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cx } from '@/lib/cx';
import { BgSection, SectionHeader } from './bg-section';
import { LazyVideo } from './lazy-video';
import { StoryFlow, type FlowStep } from './story-flow';

type VideoStat = { label: string; value: string };

/** "Our story": the autoplaying story video with its overlay and stats, beside the 01/02/03 story flow. */
export function AboutStory() {
  const t = useTranslations('about.story');
  const alt = useTranslations('about.alt');
  const stats = t.raw('videoStats') as VideoStat[];

  return (
    <BgSection id="story" className="py-2">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6 lg:px-10">
        <SectionHeader
          kicker={t('header.kicker')}
          icon={<Compass className="h-4 w-4" />}
          title={t('header.title')}
          desc={t('header.desc')}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          {/* LEFT: video + stats */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden border border-slate-200 bg-white">
              <div className="relative h-[360px] w-full sm:h-[420px] lg:aspect-4/3 lg:h-auto">
                <LazyVideo className="absolute inset-0 h-full w-full object-cover" src="/videos/shd-story-hero.mp4" />
                <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/15 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <div className="inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1 text-[12px] font-black text-white backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    {t('videoOverlay.pill')}
                  </div>

                  <div className="mt-3 text-[28px] leading-[1.05] font-black tracking-tight text-white sm:text-[34px]">
                    {t('videoOverlay.headlineLine1')}
                    <br />
                    {t('videoOverlay.headlineLine2')}
                  </div>

                  <div className="mt-2 max-w-[38ch] text-[12px] leading-relaxed text-white/85 sm:text-[13px]">
                    {t('videoOverlay.desc')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0 border-t border-slate-200">
                {stats.slice(0, 3).map((s, idx) => (
                  <div key={s.label} className={cx('p-3 sm:p-4', idx > 0 && 'border-l border-slate-200')}>
                    <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
                    <div className="mt-1 text-[14px] font-black text-slate-950">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: story flow */}
          <StoryFlow
            header={{
              kicker: t('flow.header.kicker'),
              titleLine1: t('flow.header.titleLine1'),
              titleLine2: t('flow.header.titleLine2'),
              subtitle: t('flow.header.subtitle'),
            }}
            steps={t.raw('flow.steps') as FlowStep[]}
            images={{
              step1: [
                { src: '/images/about/story/s1a.jpg', alt: alt('shenzhen') },
                { src: '/images/about/story/s1b.jpg', alt: alt('teamCelebration') },
              ],
              step2: [
                { src: '/images/about/story/tower-a.jpg', alt: alt('logo') },
                { src: '/images/about/story/tower-b.jpg', alt: alt('products') },
              ],
              wide: [
                { src: '/images/about/story/s3wide-a.jpg', alt: alt('productLineup') },
                { src: '/images/about/story/s3wide-b.jpg', alt: alt('productLineup') },
              ],
            }}
          />
        </div>
      </div>
    </BgSection>
  );
}
