import { ArrowRight, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import { type AwardItem, FlipTile, ImgTile, StatTileVideo, TextTile, VideoTextTile, VideoTile } from './award-tiles';
import { BackToTop } from './back-to-top';
import { BgSection, SectionHeader } from './bg-section';

const media = (n: number) => `/images/about/awards/a${n}.jpg`;

const VIDEO_HIGHLIGHTS = '/images/about/awards/video-highlights.mp4';
const VIDEO_RECOG_2024 = '/images/about/awards/video-2024.mp4';
const VIDEO_DREAME_2024 = '/images/about/awards/video-dreame.mp4';

/** Image sizes for the 12-column bento: a third / half / quarter of the 1100px row on desktop. */
const THIRD = '(min-width: 1180px) 360px, (min-width: 640px) 33vw, 50vw';
const THIRD_LG = '(min-width: 1180px) 360px, (min-width: 1024px) 33vw, 50vw';
const THIRD_LG_FULL = '(min-width: 1180px) 360px, (min-width: 1024px) 33vw, 100vw';
const QUARTER_LG = '(min-width: 1180px) 270px, (min-width: 1024px) 25vw, 50vw';

/** "Awards & recognition": the 12-column bento of videos, crossfading photos and award tiles, then the CTAs. */
export function AboutAwards() {
  const t = useTranslations('about.awards');
  const alt = useTranslations('about.alt');
  const awards = t.raw('items') as AwardItem[];

  // Same picks as the old page: items 2–4 on desktop, item 5 on phones, item 0 where one is missing.
  const a0 = awards[0] ?? { year: '—', title: '—', org: '—' };
  const [a2, a3, a4, a5] = [2, 3, 4, 5].map((i) => awards[i] ?? a0) as [AwardItem, AwardItem, AwardItem, AwardItem];

  return (
    <BgSection className="py-2">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6 lg:px-10">
        <SectionHeader
          kicker={t('header.kicker')}
          icon={<Award className="h-4 w-4" />}
          title={t('header.title')}
          desc={t('header.desc')}
        />

        <div className="mt-8">
          <div className="grid grid-cols-12 gap-3">
            <VideoTile
              className="col-span-12 sm:col-span-4"
              src={VIDEO_HIGHLIGHTS}
              label={t('grid.labels.highlights')}
            />

            <FlipTile
              className="col-span-6 sm:col-span-4"
              a={{ src: media(2), alt: alt('award70mai') }}
              b={{ src: media(3), alt: alt('summitTeam') }}
              sizes={THIRD}
              label={t('grid.labels.moments')}
              intervalMs={2600}
            />

            <StatTileVideo
              className="col-span-6 sm:col-span-4"
              videoSrc={VIDEO_RECOG_2024}
              count={Math.max(1, awards.length)}
              pill={t('grid.statPill')}
              year={t('grid.statYear')}
              title={t('grid.statTitle')}
              desc={t('grid.statDesc')}
            />

            <VideoTextTile
              className="col-span-12 lg:col-span-6"
              videoSrc={VIDEO_DREAME_2024}
              year={t('grid.feature.year')}
              title={t('grid.feature.title')}
              org={t('grid.feature.org')}
            />

            <ImgTile className="col-span-6 lg:col-span-3" src={media(6)} alt={alt('awardAnker')} sizes={QUARTER_LG} />
            <ImgTile className="col-span-6 lg:col-span-3" src={media(7)} alt={alt('summitWinner')} sizes={QUARTER_LG} />

            <ImgTile className="col-span-6 lg:col-span-4" src={media(8)} alt={alt('summitWinner')} sizes={THIRD_LG} />

            <TextTile
              className="col-span-6 lg:col-span-4"
              textTone="black"
              titleClassName="text-base sm:text-lg"
              a={{ year: t('grid.textTile.year'), title: t('grid.textTile.title'), org: t('grid.textTile.org') }}
              bgSrc={media(9)}
              sizes={THIRD_LG}
            />

            <FlipTile
              className="col-span-12 lg:col-span-4"
              a={{ src: media(10), alt: alt('teamCelebration') }}
              b={{ src: media(11), alt: alt('teamCelebration') }}
              sizes={THIRD_LG_FULL}
              label={t('grid.labels.trusted')}
              intervalMs={3000}
            />

            <div className="hidden lg:col-span-4 lg:block">
              <TextTile className="h-full" a={a2} bgSrc={media(12)} sizes="360px" />
            </div>
            <div className="hidden lg:col-span-4 lg:block">
              <TextTile className="h-full" a={a3} bgSrc={media(13)} sizes="360px" />
            </div>
            <div className="hidden lg:col-span-4 lg:block">
              <TextTile className="h-full" a={a4} bgSrc={media(14)} sizes="360px" />
            </div>

            <div className="col-span-12 lg:hidden">
              <TextTile className="" a={a5} bgSrc={media(1)} sizes="100vw" />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className={cx(
                'inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black text-white',
                'bg-[#C25A2A]',
                'transition hover:-translate-y-0.5 active:scale-[0.98]',
              )}
            >
              {t('actions.explore')} <ArrowRight className="h-4 w-4" />
            </Link>

            <BackToTop label={t('actions.backToTop')} />
          </div>
        </div>

        <div className="h-4" />
      </div>
    </BgSection>
  );
}
