import { CalendarHeart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LifeGallery } from './life-gallery';
import type { LifeCategory } from './types';

const EVENT_PHOTOS = Array.from({ length: 10 }, (_, i) => `/images/why/events/e${i + 1}.jpg`);

export function LifeSection() {
  const t = useTranslations('why.life');

  const categories: LifeCategory[] = [
    { key: 'events', title: t('categories.1'), cover: EVENT_PHOTOS[0]!, images: EVENT_PHOTOS.slice(0, 4) },
    { key: 'culture', title: t('categories.2'), cover: EVENT_PHOTOS[4]!, images: EVENT_PHOTOS.slice(4, 7) },
    { key: 'team', title: t('categories.3'), cover: EVENT_PHOTOS[7]!, images: EVENT_PHOTOS.slice(7, 10) },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(800px_520px_at_70%_30%,rgba(255,255,255,0.58),transparent_60%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-[1160px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-slate-900 backdrop-blur-sm">
                <CalendarHeart className="h-4 w-4" />
                {t('kicker')}
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{t('title')}</h3>
              <p className="mt-2 max-w-[70ch] text-sm text-slate-700">{t('subtitle')}</p>
            </div>

            <div className="text-[11px] text-slate-500">{t('note')}</div>
          </div>

          <LifeGallery categories={categories} />
        </div>
      </div>
    </section>
  );
}
