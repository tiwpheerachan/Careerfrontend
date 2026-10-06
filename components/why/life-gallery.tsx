'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { useBlockClickOnDrag } from './hooks';
import { LifeGalleryModal } from './life-gallery-modal';
import type { LifeCategory } from './types';

function LifeCategoryCard({
  title,
  coverSrc,
  viewLabel,
  openLabel,
  onClick,
}: {
  title: string;
  coverSrc: string;
  viewLabel: string;
  openLabel: string;
  onClick: () => void;
}) {
  const drag = useBlockClickOnDrag(10);

  return (
    <button
      type="button"
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerUp}
      onClick={(e) => {
        if (drag.shouldBlockClick()) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick();
      }}
      className={cx(
        'group relative overflow-hidden rounded-[28px] text-left',
        'bg-white ring-1 ring-slate-200',
        'shadow-[0_18px_70px_-30px_rgba(15,23,42,0.35)]',
        'transition hover:-translate-y-1 active:scale-[0.99]',
        'focus:outline-hidden focus-visible:ring-[3px] focus-visible:ring-slate-900/20',
      )}
    >
      <div className="relative aspect-video w-full bg-slate-50">
        <Image
          src={coverSrc}
          alt={title}
          fill
          sizes="(min-width: 1240px) 376px, (min-width: 768px) 33vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.04]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-linear-to-b from-white/0 via-white/0 to-black/30" />

        <div className="absolute top-4 right-4 left-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full  px-3 py-1.5 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {viewLabel}
          </div>
          <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">SHD</div>
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(600px_260px_at_55%_15%,rgba(255,255,255,0.30),transparent_60%)]" />
        </div>
      </div>

      <div className="p-5">
        <div className="text-[15px] font-black tracking-tight text-slate-950">{title}</div>
        <div className="mt-3 h-px w-full bg-linear-to-r from-transparent via-slate-200 to-transparent" />
        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {openLabel}
        </div>
      </div>
    </button>
  );
}

/** The three Life-at-SHD category cards; each opens its photo gallery. */
export function LifeGallery({ categories }: { categories: LifeCategory[] }) {
  const t = useTranslations('why.life');
  const [open, setOpen] = useState<LifeCategory | null>(null);

  return (
    <>
      <LifeGalleryModal category={open} onClose={() => setOpen(null)} />

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {categories.map((c) => (
          <LifeCategoryCard
            key={c.key}
            title={c.title}
            coverSrc={c.cover}
            viewLabel={t('viewPhotos')}
            openLabel={t('openGallery')}
            onClick={() => setOpen(c)}
          />
        ))}
      </div>
    </>
  );
}
