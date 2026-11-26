'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import imageLoader from '@/lib/image-loader';
import { usePrefersReducedMotion } from './hooks';

type Props = { src: string; className?: string; style?: CSSProperties };

/**
 * A muted, looping background video that downloads nothing until it comes near
 * the viewport (preload="none"), then plays while it is on screen and pauses
 * when it leaves. With prefers-reduced-motion or the browser's data saver it
 * never plays: once near, only its poster is loaded.
 *
 * The poster is `<video name>-poster.jpg` beside the video.
 */
export function LazyVideo({ src, className, style }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Not in TypeScript's DOM types (Chromium only).
    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } };
    const still = reduced || connection?.saveData;
    if (still) video.pause();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        // Set here, not as an attribute: browsers download a poster at once, however far down it is.
        if (visible && !video.poster) {
          video.poster = imageLoader({ src: src.replace(/\.mp4$/, '-poster.jpg'), width: 828 });
        }
        if (still) return;
        if (visible) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduced, src]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={src}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}
