'use client';

import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/lib/i18n/navigation';
import { cx } from '@/lib/cx';
import { MOBILE_QUERY, useMediaQuery } from './hooks';
import { ModalClose, ModalShell, ModalTitle } from './modal-shell';
import type { ModalItem } from './types';

/** An employee story, opened from the carousel: centered on desktop, a bottom sheet on phones. */
export function ImageModal({ item, onClose }: { item: ModalItem | null; onClose: () => void }) {
  const t = useTranslations('why');
  const isMobile = useMediaQuery(MOBILE_QUERY);

  if (!item) return null;

  if (isMobile) {
    return (
      <ModalShell
        open
        onClose={onClose}
        sheet
        overlayClassName={cx('fixed inset-0 z-80 flex items-end justify-center p-0', 'bg-white/70 backdrop-blur-md')}
        className={cx(
          'relative w-full max-w-[720px] overflow-hidden outline-hidden',
          'rounded-t-[28px] bg-white ring-1 ring-slate-200',
          'shadow-[0_-30px_140px_rgba(15,23,42,0.28)]',
        )}
        style={{ maxHeight: '92vh' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3  px-4 py-3 backdrop-blur-sm">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
              <Sparkles className="h-3.5 w-3.5" />
              {t('modal.brand')}
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

        <div className="flex flex-col">
          <div className="relative aspect-4/3 w-full bg-slate-50">
            <Image src={item.src} alt={item.title} fill sizes="100vw" className="object-cover" draggable={false} />
            <div className="absolute inset-0 bg-linear-to-b from-white/0 via-white/0 to-black/15" />

            <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {t('common.expand')}
              </div>
              {item.badge ? (
                <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                  {item.badge}
                </div>
              ) : null}
            </div>
          </div>

          <div className="max-h-[48vh] overflow-y-auto px-4 pt-4 pb-6">
            {item.name || item.role ? (
              <div className="flex flex-wrap items-center gap-2">
                {item.name ? (
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                    {item.name}
                  </span>
                ) : null}
                {item.role ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                    {item.role}
                  </span>
                ) : null}
              </div>
            ) : null}

            <ModalTitle className="mt-3 text-[18px] leading-snug font-black tracking-tight text-slate-950">
              {item.headline || item.title}
            </ModalTitle>

            {item.desc ? (
              <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">{item.desc}</div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/jobs"
                className={cx(
                  'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black',
                  'bg-slate-950 text-white',
                  'shadow-[0_18px_70px_rgba(15,23,42,0.22)]',
                  'transition active:scale-[0.98]',
                )}
              >
                {t('modal.viewOpenRoles')}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="text-center text-[11px] text-slate-500">{t('modal.hint')}</div>
            </div>
          </div>
        </div>

        <div className="h-2 bg-white" />
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      sheet={false}
      overlayClassName={cx(
        'fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-6',
        'bg-white/65 backdrop-blur-md',
      )}
      className={cx(
        'relative w-full max-w-[1100px] overflow-hidden rounded-[28px] outline-hidden',
        'bg-white shadow-[0_50px_180px_rgba(15,23,42,0.35)]',
        'ring-1 ring-slate-200',
      )}
    >
      <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between p-3 sm:p-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          {t('modal.brand')}
        </div>

        <ModalClose
          className={cx(
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
            'bg-white/90 text-slate-900 backdrop-blur-sm',
            'ring-1 ring-slate-200',
            'transition hover:bg-white active:scale-[0.98]',
          )}
          aria-label={t('modal.closeAria')}
        >
          <X className="h-5 w-5" />
        </ModalClose>
      </div>

      <div className="relative aspect-2/1 w-full bg-white">
        <Image
          src={item.src}
          alt={item.title}
          fill
          sizes="(min-width: 1148px) 1100px, 100vw"
          className="object-contain"
          draggable={false}
        />

        <div className="absolute inset-0 bg-linear-to-b from-white/0 via-white/0 to-black/55" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_420px_at_50%_30%,rgba(255,255,255,0.22),transparent_60%)]" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div
            className={cx(
              'rounded-3xl  p-4 text-slate-950 backdrop-blur-xl sm:p-5',
              'shadow-[0_24px_120px_rgba(15,23,42,0.25)]',
              'ring-1 ring-slate-200',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {item.badge ? (
                <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                  {item.badge}
                </span>
              ) : null}
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                {t('modal.tapToExplore')}
              </span>
            </div>

            {item.name || item.role ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {item.name ? (
                  <span className="rounded-full bg-slate-950 px-3 py-1 font-black text-white">{item.name}</span>
                ) : null}
                {item.role ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                    {item.role}
                  </span>
                ) : null}
              </div>
            ) : null}

            <ModalTitle className="mt-3 text-lg font-black tracking-tight sm:text-xl">{item.title}</ModalTitle>

            {item.desc ? (
              <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">{item.desc}</div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/jobs"
                className={cx(
                  'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black',
                  'bg-slate-950 text-white',
                  'shadow-[0_18px_70px_rgba(15,23,42,0.25)]',
                  'transition hover:-translate-y-0.5 active:scale-[0.98]',
                )}
              >
                {t('modal.viewOpenRoles')} <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="text-[11px] text-slate-500">{t('modal.hint')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-2 bg-white" />
    </ModalShell>
  );
}
