'use client';

import { Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { cx } from '@/lib/cx';
import { MOBILE_QUERY, useMediaQuery } from './hooks';
import { ModalClose, ModalShell, ModalTitle } from './modal-shell';
import type { LifeCategory } from './types';

/** A Life-at-SHD category's photos in a horizontal snap row: centered on desktop, a bottom sheet on phones. */
export function LifeGalleryModal({ category, onClose }: { category: LifeCategory | null; onClose: () => void }) {
  const t = useTranslations('why');
  const isMobile = useMediaQuery(MOBILE_QUERY);

  if (!category) return null;
  const { title, images } = category;

  return (
    <ModalShell
      open
      onClose={onClose}
      sheet={isMobile}
      overlayClassName={cx('fixed inset-0 z-90 flex items-center justify-center', 'bg-white/70 backdrop-blur-md')}
      className={cx(
        'relative w-full overflow-hidden bg-white ring-1 ring-slate-200 outline-hidden',
        isMobile
          ? 'mx-0 h-[92vh] self-end rounded-t-[28px]'
          : 'mx-4 max-w-[1200px] rounded-[28px] shadow-[0_50px_180px_rgba(15,23,42,0.30)]',
      )}
    >
      <div
        className={cx(
          'flex items-center justify-between gap-3 px-4 py-3',
          ' backdrop-blur-sm',
          'border-b border-slate-200/70',
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
              <Sparkles className="h-3.5 w-3.5" />
              SHD
            </span>
            <ModalTitle className="truncate text-sm font-black text-slate-950">{title}</ModalTitle>
          </div>
        </div>

        <ModalClose
          className={cx(
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
            'bg-white text-slate-900 ring-1 ring-slate-200',
            'transition active:scale-[0.98]',
          )}
          aria-label={t('modal.closeAria')}
        >
          <X className="h-5 w-5" />
        </ModalClose>
      </div>

      <div className={cx('p-4', isMobile ? 'h-[calc(92vh-60px)]' : 'max-h-[80vh]')}>
        <div
          className={cx(
            'no-scrollbar flex h-full gap-3 overflow-x-auto overflow-y-hidden',
            'snap-x snap-mandatory scroll-smooth',
            'touch-pan-x',
          )}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
        >
          {images.map((src, i) => (
            <div
              key={src}
              className={cx(
                'relative shrink-0 snap-start overflow-hidden rounded-3xl',
                'bg-slate-50 ring-1 ring-slate-200',
                isMobile ? 'h-full w-[86vw]' : 'h-[70vh] w-[min(920px,72vw)]',
              )}
            >
              <Image
                src={src}
                alt={t('life.photoAlt', { title, index: i + 1 })}
                fill
                sizes={isMobile ? '86vw' : 'min(920px, 72vw)'}
                className="object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
