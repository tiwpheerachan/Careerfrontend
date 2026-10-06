'use client';

import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { MOBILE_QUERY, useAutoScrollCarousel, useMediaQuery, usePrefersReducedMotion } from './hooks';
import { ImageModal } from './image-modal';
import { StoryMobileCard, StoryTemplateSlide } from './story-cards';
import type { ModalItem, Story } from './types';

const arrowButton = cx(
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl',
  'bg-white text-slate-900',
  'ring-1 ring-slate-200 shadow-[0_12px_40px_rgba(15,23,42,0.10)]',
  'transition hover:-translate-y-0.5 active:scale-[0.98]',
  'focus:outline-hidden focus-visible:ring-[3px] focus-visible:ring-slate-900/20',
);

function toModalItem(story: Story, src: string): ModalItem {
  return {
    src,
    title: story.person?.headline || story.title,
    desc: story.person?.quote || story.desc,
    badge: story.badge,
    name: story.person?.name,
    role: story.person?.role,
    headline: story.person?.headline,
  };
}

/**
 * Employee stories: the intro column with pause/play and arrows, and the
 * auto-advancing track (every 3.2s; pauses on hover or touch, resumes after 3s
 * idle; never auto-advances for prefers-reduced-motion). A card opens the story popup.
 */
export function StoriesCarousel({ intro, note, stories }: { intro: ReactNode; note: string; stories: Story[] }) {
  const t = useTranslations('why');
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const reducedMotion = usePrefersReducedMotion();

  const { setTrack, userPaused, setUserPaused, setHovered, markUserAction, scrollByDir } = useAutoScrollCarousel({
    enabled: !reducedMotion,
    intervalMs: 3200,
    stepPx: isMobile ? 360 : 920,
    idleResumeMs: 3000,
    smooth: !reducedMotion,
  });

  const [modalItem, setModalItem] = useState<ModalItem | null>(null);

  const expandLabel = t('common.expand');
  const fallbackAlt = t('stories.imageAlt');

  return (
    <div className="grid gap-8 lg:grid-cols-4 lg:items-start">
      <ImageModal item={modalItem} onClose={() => setModalItem(null)} />

      <div className="lg:col-span-1">
        {intro}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUserPaused((v) => !v)}
            className={cx(
              'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black',
              'bg-white text-slate-900 ring-1 ring-slate-200',
              'shadow-none',
              'transition hover:-translate-y-0.5 active:scale-[0.98]',
              'focus:outline-hidden focus-visible:ring-[3px] focus-visible:ring-slate-900/20',
            )}
          >
            {userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {userPaused ? t('carousel.autoPlay') : t('carousel.pause')}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByDir(-1)}
              className={arrowButton}
              aria-label={t('carousel.leftAria')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDir(1)}
              className={arrowButton}
              aria-label={t('carousel.rightAria')}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500">{note}</div>
      </div>

      <div className="lg:col-span-3">
        <div
          ref={setTrack}
          className={cx(
            'no-scrollbar flex gap-4 overflow-x-auto scroll-smooth pb-3 sm:gap-5',
            'snap-x snap-mandatory',
            'touch-pan-x',
            'motion-reduce:scroll-auto',
          )}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onPointerDown={markUserAction}
          onWheel={markUserAction}
          onTouchStart={markUserAction}
        >
          {stories.map((story) => (
            <div key={story.srcDesktop} className="snap-start">
              <div className="sm:hidden">
                <StoryMobileCard
                  src={story.srcMobile}
                  badge={story.badge}
                  expandLabel={expandLabel}
                  tapLabel={t('stories.tapToExpand')}
                  fallbackAlt={fallbackAlt}
                  person={story.person}
                  onClick={() => setModalItem(toModalItem(story, story.srcMobile))}
                />
              </div>

              <div className="hidden sm:block">
                <StoryTemplateSlide
                  src={story.srcDesktop}
                  badge={story.badge}
                  expandLabel={expandLabel}
                  fallbackAlt={fallbackAlt}
                  person={story.person}
                  onClick={() => setModalItem(toModalItem(story, story.srcDesktop))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
