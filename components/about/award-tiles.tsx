import { Award, CheckCircle2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { FlipImage, type FlipSource } from './flip-image';
import { LazyVideo } from './lazy-video';

/*
 * The awards bento tiles. The old page declared every one of these inside
 * render, so each re-render (every frame of the hero count-up) unmounted and
 * remounted them — restarting their videos. Here they are module-level.
 */

export type AwardItem = { year: string; title: string; org: string; note?: string };

const tile = 'relative overflow-hidden rounded-3xl min-h-[140px] sm:min-h-[170px]';

function CornerLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-[11px] font-black text-white">
      {icon}
      {text}
    </div>
  );
}

function YearPill({ year, tone = 'dark' }: { year: string; tone?: 'dark' | 'light' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black',
        tone === 'dark' ? 'bg-black/35 text-white' : 'bg-white/75 text-slate-900',
      )}
    >
      {year}
    </span>
  );
}

function FullBleedVideo({ src }: { src: string }) {
  return (
    <LazyVideo
      src={src}
      className="absolute inset-0 object-cover"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export function VideoTile({ src, className, label }: { src: string; className: string; label?: string }) {
  return (
    <div className={cx(tile, className)}>
      <FullBleedVideo src={src} />
      {label ? <CornerLabel icon={<Award className="h-3.5 w-3.5" />} text={label} /> : null}
    </div>
  );
}

export function ImgTile({
  src,
  alt,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  className: string;
}) {
  return (
    <div className={cx(tile, className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

export function FlipTile({
  a,
  b,
  sizes,
  className,
  label,
  intervalMs,
}: {
  a: FlipSource;
  b: FlipSource;
  sizes: string;
  className: string;
  label?: string;
  intervalMs: number;
}) {
  return (
    <FlipImage a={a} b={b} intervalMs={intervalMs} sizes={sizes} className={cx(tile, className)}>
      {label ? <CornerLabel icon={<Sparkles className="h-3.5 w-3.5" />} text={label} /> : null}
    </FlipImage>
  );
}

/** An award over a background picture; the picture is decorative (alt=""), the text carries the content. */
export function TextTile({
  a,
  className,
  bgSrc,
  sizes,
  textTone = 'white',
  titleClassName = 'text-sm sm:text-base',
}: {
  a: AwardItem;
  className: string;
  bgSrc: string;
  sizes: string;
  textTone?: 'white' | 'black';
  titleClassName?: string;
}) {
  const white = textTone === 'white';
  return (
    <div className={cx(tile, className)}>
      <Image
        src={bgSrc}
        alt=""
        fill
        sizes={sizes}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className={cx('relative p-5 sm:p-6', white ? 'text-white' : 'text-slate-900')}>
        <div className="flex items-start justify-between gap-3">
          <YearPill year={a.year} tone={white ? 'dark' : 'light'} />
          <CheckCircle2 className={cx('h-5 w-5', white ? 'text-emerald-300' : 'text-emerald-600')} />
        </div>

        <div className={cx('mt-3 leading-snug font-black', titleClassName)}>{a.title}</div>

        <div className={cx('mt-2 text-sm leading-relaxed', white ? 'text-white/90' : 'text-slate-700')}>{a.org}</div>

        {a.note ? <div className={cx('mt-3 text-xs', white ? 'text-white/80' : 'text-slate-600')}>{a.note}</div> : null}
      </div>
    </div>
  );
}

export function VideoTextTile({
  videoSrc,
  title,
  org,
  year,
  className,
}: {
  videoSrc: string;
  title: string;
  org: string;
  year: string;
  className: string;
}) {
  return (
    <div className={cx(tile, className)}>
      <FullBleedVideo src={videoSrc} />
      <div className="relative p-5 text-white sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <YearPill year={year} tone="dark" />
          <CheckCircle2 className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="mt-3 text-base leading-snug font-black sm:text-lg sm:leading-7">{title}</div>
        <div className="mt-2 text-sm leading-relaxed text-white/90">{org}</div>
      </div>
    </div>
  );
}

export function StatTileVideo({
  videoSrc,
  className,
  count,
  pill,
  year,
  title,
  desc,
}: {
  videoSrc: string;
  className: string;
  count: number;
  pill: string;
  year: string;
  title: string;
  desc: string;
}) {
  return (
    <div className={cx(tile, className)}>
      <FullBleedVideo src={videoSrc} />
      <div className="relative p-5 text-white sm:p-6">
        {/* Wraps: on phones the tile is half the screen, too narrow for both pills on one line. */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/35 px-3 py-1 text-[11px] font-black">
            <Sparkles className="h-3.5 w-3.5" />
            {pill}
          </div>
          <YearPill year={year} tone="dark" />
        </div>

        <div className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          {count}
          <span className="text-white/70">+</span>
        </div>

        <div className="mt-2 text-sm font-black text-white/95">{title}</div>

        <div className="mt-4 text-sm leading-relaxed text-white/85">{desc}</div>
      </div>
    </div>
  );
}
