import { Quote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StoriesCarousel } from './stories-carousel';
import type { Story, StoryPerson } from './types';

/**
 * The stories that have a photo. (The old page built 14 and rendered the first
 * 3; s4–s14 never existed.)
 */
const STORY_COUNT = 3;
const BADGES = ['growth', 'team', 'impact'] as const;

export function StoriesSection() {
  const t = useTranslations('why.stories');

  const stories: Story[] = Array.from({ length: STORY_COUNT }, (_, i) => {
    const idx = i + 1;
    const name = t(`cards.${idx}.name`);
    const role = t(`cards.${idx}.role`);
    const headline = t(`cards.${idx}.headline`);
    const quote = t(`cards.${idx}.quote`);
    const person: StoryPerson | undefined =
      name && role && headline && quote ? { name, role, headline, quote } : undefined;

    return {
      srcDesktop: `/images/why/stories/s${idx}.jpg`,
      srcMobile: `/images/why/stories/mobile/s${idx}.jpg`,
      title: t('itemTitle', { index: idx }),
      desc: t('itemDesc'),
      badge: t(`badges.${BADGES[i % 3]!}`),
      person,
    };
  });

  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_22%,rgba(255,255,255,0.62),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
        <StoriesCarousel
          stories={stories}
          note={t('note')}
          intro={
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                <Quote className="h-4 w-4" />
                {t('kicker')}
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{t('title')}</h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-700">{t('subtitle')}</p>
            </>
          }
        />
      </div>
    </section>
  );
}
