'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { usePrefersReducedMotion } from './hooks';

type Props = { src: string; className?: string; style?: CSSProperties; poster?: string };

/**
 * A muted, looping background video that downloads nothing until it comes near
 * the viewport (preload="none"), then plays while it is on screen and pauses
 * when it leaves. With prefers-reduced-motion it never plays: once near, only
 * its first frame is loaded so the tile is not left blank.
 */
export function LazyVideo({ src, className, style, poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (reduced) video.pause();

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (reduced) {
          if (visible && video.preload === 'none') {
            video.preload = 'metadata';
            video.load();
          }
          return;
        }
        if (visible) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      src={reduced ? `${src}#t=0.1` : src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
    />
  );
}
