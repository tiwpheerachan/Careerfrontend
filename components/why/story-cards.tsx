'use client';

import { CheckCircle2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { MouseEvent } from 'react';
import { cx } from '@/lib/cx';
import { useBlockClickOnDrag } from './hooks';
import type { StoryPerson } from './types';

type CardProps = {
  src: string;
  expandLabel: string;
  badge?: string;
  person?: StoryPerson;
  /** Alt text when the story has no headline. */
  fallbackAlt: string;
  onClick: () => void;
};

/** Pointer handlers + a click that is ignored when it ends a drag. */
function useDragSafeClick(onClick: () => void) {
  const drag = useBlockClickOnDrag(10);
  return {
    onPointerDown: drag.onPointerDown,
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
    onPointerCancel: drag.onPointerUp,
    onClick: (e: MouseEvent) => {
      if (drag.shouldBlockClick()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick();
    },
  };
}

/** Desktop slide: the 2:1 story template with the name, role and quote laid over it. */
export function StoryTemplateSlide({ src, expandLabel, badge, person, fallbackAlt, onClick }: CardProps) {
  const handlers = useDragSafeClick(onClick);

  return (
    <button
      type="button"
      {...handlers}
      className={cx(
        'group relative shrink-0 overflow-hidden rounded-[28px] text-left',
        'w-[min(94vw,820px)] sm:w-[min(84vw,860px)] lg:w-[860px]',
        'transition hover:-translate-y-0.5 active:scale-[0.99]',
        'focus:outline-hidden focus-visible:ring-[3px] focus-visible:ring-slate-900/20',
      )}
    >
      <div className="relative aspect-2/1 w-full bg-white">
        <Image
          src={src}
          alt={person?.headline || fallbackAlt}
          fill
          sizes="(min-width: 1024px) 860px, (min-width: 640px) 84vw, 94vw"
          className="object-contain"
          draggable={false}
        />

        <div className="absolute top-4 right-4 left-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {expandLabel}
          </div>

          {badge ? (
            <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">{badge}</div>
          ) : (
            <div className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200 backdrop-blur-sm">
              SHD
            </div>
          )}
        </div>

        {person ? (
          <div
            className={cx(
              'absolute top-[28%] left-[6%] w-[56%]',
              'sm:top-[30%] sm:left-[7%] sm:w-[54%]',
              'lg:top-[30%] lg:left-[7%] lg:w-[52%]',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white">{person.name}</span>
              <span className="rounded-full bg-orange-400 px-4 py-2 text-sm font-black text-white">{person.role}</span>
            </div>

            <div className="mt-4 text-sm leading-relaxed whitespace-pre-line text-slate-800">{person.quote}</div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
          <div className="absolute inset-0 bg-[radial-gradient(560px_240px_at_40%_20%,rgba(255,255,255,0.28),transparent_60%)]" />
        </div>
      </div>
    </button>
  );
}

/** Phone card: a 4:3 photo with the text below it. */
export function StoryMobileCard({
  src,
  expandLabel,
  badge,
  person,
  fallbackAlt,
  tapLabel,
  onClick,
}: CardProps & { tapLabel: string }) {
  const handlers = useDragSafeClick(onClick);

  return (
    <button
      type="button"
      {...handlers}
      className={cx(
        'group relative shrink-0 text-left',
        'w-[min(88vw,420px)]',
        'rounded-[26px] bg-white ring-1 ring-slate-200',
        'shadow-[0_18px_70px_-30px_rgba(15,23,42,0.35)]',
        'transition active:scale-[0.99]',
        'focus:outline-hidden focus-visible:ring-[3px] focus-visible:ring-slate-900/20',
        'overflow-hidden',
      )}
    >
      <div className="relative aspect-4/3 w-full bg-slate-50">
        <Image
          src={src}
          alt={person?.headline || fallbackAlt}
          fill
          sizes="(max-width: 477px) 88vw, 420px"
          className="object-cover transition duration-700 group-hover:scale-[1.03]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-linear-to-b from-white/0 via-white/0 to-black/30" />

        <div className="absolute top-3 right-3 left-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full  px-3 py-1.5 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {expandLabel}
          </div>
          {badge ? (
            <div className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">{badge}</div>
          ) : (
            <div className="rounded-full  px-3 py-1 text-[11px] font-semibold text-slate-900 ring-1 ring-slate-200 backdrop-blur-sm">
              SHD
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {person?.name || person?.role ? (
          <div className="flex flex-wrap items-center gap-2">
            {person?.name ? (
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">
                {person.name}
              </span>
            ) : null}
            {person?.role ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                {person.role}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 text-[15px] leading-snug font-black tracking-tight text-slate-950">
          {person?.headline || fallbackAlt}
        </div>

        {person?.quote ? (
          <div className="mt-2 line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {person.quote}
          </div>
        ) : (
          <div className="mt-2 text-sm text-slate-700">—</div>
        )}

        <div className="mt-4 h-px w-full bg-linear-to-r from-transparent via-slate-200 to-transparent" />

        <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {tapLabel}
        </div>
      </div>
    </button>
  );
}
