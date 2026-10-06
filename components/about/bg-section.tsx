import Image from 'next/image';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * A section that can carry a full-bleed background image behind its content.
 * Several old sections pointed at background files that never existed
 * (about/story.jpg, culture.jpg, journey.jpg, awards.jpg); those sections are
 * simply rendered without `bgSrc`, which is how they always looked.
 */
export function BgSection({
  id,
  bgSrc,
  className,
  children,
}: {
  id?: string;
  bgSrc?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cx('relative isolate overflow-hidden', className)}>
      {bgSrc ? (
        <div className="absolute inset-0 -z-10">
          <Image src={bgSrc} alt="" fill preload sizes="100vw" className="object-cover object-center" />
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionHeader({
  kicker,
  title,
  desc,
  icon,
  align = 'left',
}: {
  kicker: string;
  title: string;
  desc?: string;
  icon?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={cx('flex flex-col gap-3', align === 'center' ? 'items-center text-center' : '')}>
      <div className={cx('inline-flex', align === 'center' ? 'justify-center' : '')}>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-sm">
          {icon}
          {kicker}
        </span>
      </div>

      <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      {desc ? <p className="max-w-[82ch] text-sm leading-relaxed text-slate-700">{desc}</p> : null}
    </div>
  );
}
