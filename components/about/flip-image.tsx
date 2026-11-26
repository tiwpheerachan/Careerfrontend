'use client';

import Image from 'next/image';
import { useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { useAlternate, useOnScreen, usePrefersReducedMotion } from './hooks';

export type FlipSource = { src: string; alt: string };

/**
 * Two images stacked in `className`'s box that crossfade every `intervalMs`.
 * Defined once at module level (the old page declared it inside render, so it
 * remounted — and restarted its timer — on every frame of the count-up).
 * With reduced motion it stays on the first image.
 *
 * The second image is requested only near the viewport, and the crossfading
 * starts once it has loaded, so the first one never fades to an empty box.
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
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const reduced = usePrefersReducedMotion();
  const [bLoaded, setBLoaded] = useState(false);
  const onA = useAlternate(intervalMs, onScreen && bLoaded);
  const img = 'absolute inset-0 h-full w-full object-cover transition-opacity duration-700';

  return (
    <div ref={ref} className={className}>
      <Image
        src={a.src}
        alt={a.alt}
        fill
        sizes={sizes}
        draggable={false}
        aria-hidden={!onA}
        className={cx(img, onA ? 'opacity-100' : 'opacity-0')}
      />
      {!reduced && (onScreen || bLoaded) ? (
        <Image
          src={b.src}
          alt={b.alt}
          fill
          sizes={sizes}
          draggable={false}
          onLoad={() => setBLoaded(true)}
          aria-hidden={onA}
          className={cx(img, onA ? 'opacity-0' : 'opacity-100')}
        />
      ) : null}
      {children}
    </div>
  );
}
