'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { useAlternate } from './hooks';

export type FlipSource = { src: string; alt: string };

/**
 * Two images stacked in `className`'s box that crossfade every `intervalMs`.
 * Defined once at module level (the old page declared it inside render, so it
 * remounted — and restarted its timer — on every frame of the count-up).
 * With reduced motion it stays on the first image.
 */
export function FlipImage({
  a,
  b,
  intervalMs,
  sizes,
  className,
  children,
}: {
  a: FlipSource;
  b: FlipSource;
  intervalMs: number;
  sizes: string;
  className?: string;
  children?: ReactNode;
}) {
  const onA = useAlternate(intervalMs);
  const img = 'absolute inset-0 h-full w-full object-cover transition-opacity duration-700';

  return (
    <div className={className}>
      <Image
        src={a.src}
        alt={a.alt}
        fill
        sizes={sizes}
        draggable={false}
        aria-hidden={!onA}
        className={cx(img, onA ? 'opacity-100' : 'opacity-0')}
      />
      <Image
        src={b.src}
        alt={b.alt}
        fill
        sizes={sizes}
        draggable={false}
        aria-hidden={onA}
        className={cx(img, onA ? 'opacity-0' : 'opacity-100')}
      />
      {children}
    </div>
  );
}
