import { Sparkles } from 'lucide-react';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { cx } from '@/lib/cx';
import styles from './gallery.module.css';

/** 17 horizontal 16:8 logos: odd ones on the top row, even ones on the bottom. */
const GALLERY = Array.from({ length: 17 }, (_, i) => `/images/gallery/g${i + 1}.jpg`);
const TOP = GALLERY.filter((_, i) => i % 2 === 0);
const BOTTOM = GALLERY.filter((_, i) => i % 2 === 1);

function Row({
  images,
  direction,
  alt,
}: {
  images: string[];
  direction: 'left' | 'right';
  alt: (n: number) => string;
}) {
  // Each row is its images twice, moved by half its width: a seamless loop.
  const track = [...images, ...images];
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-white/80 to-white/0" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-white/80 to-white/0" />

      <div className="no-scrollbar overflow-x-auto">
        <div className={cx('flex w-max gap-2.5 pr-6 will-change-transform', styles[direction])}>
          {track.map((src, idx) => (
            <div key={`${src}-${idx}`} className="shrink-0">
              <div className="w-[160px] sm:w-[190px] md:w-[220px]">
                <div className="group overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-16/8">
                    <Image
                      src={src}
                      alt={alt(idx + 1)}
                      fill
                      sizes="(min-width: 768px) 220px, (min-width: 640px) 190px, 160px"
                      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-linear-to-b from-white/0 via-white/0 to-white/35" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export async function Gallery() {
  const t = await getTranslations('home.gallery');

  return (
    <section className={cx('container-page py-14', styles.section)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700">
            <Sparkles className="h-4 w-4" />
            {t('badge')}
          </div>

          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{t('title')}</h2>

          <p className="mt-2 text-sm text-slate-600">{t('desc')}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white/70 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-sm">
        <div className="p-4 md:p-5">
          <Row images={TOP} direction="left" alt={(n) => t('imageAltTop', { n })} />
          <div className="h-3.5" />
          <Row images={BOTTOM} direction="right" alt={(n) => t('imageAltBottom', { n })} />
        </div>
      </div>
    </section>
  );
}
