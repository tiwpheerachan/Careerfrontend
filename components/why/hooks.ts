'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { PointerEvent } from 'react';

/** True while `query` matches. False on the server and during hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The old site's breakpoint for the phone layouts of the modals and the carousel step. */
export const MOBILE_QUERY = '(max-width: 639px)';

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Auto-advancing horizontal scroller: pauses while hovered or after the user
 * touches it, resumes after `idleResumeMs` of no interaction. The callback ref
 * starts the timer once the element exists.
 */
export function useAutoScrollCarousel(opts: {
  enabled: boolean;
  intervalMs?: number;
  stepPx?: number;
  idleResumeMs?: number;
  smooth?: boolean;
}) {
  const { enabled, intervalMs = 3000, stepPx = 560, idleResumeMs = 3000, smooth = true } = opts;
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const setTrack = useCallback((node: HTMLDivElement | null) => setEl(node), []);

  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const lastUserAction = useRef(0);

  useEffect(() => {
    if (!enabled || !el) return;
    let tick: number | undefined;

    const run = () => {
      if (userPaused && idleResumeMs > 0 && Date.now() - lastUserAction.current > idleResumeMs) {
        setUserPaused(false);
      }
      if (!(hovered || userPaused)) {
        const max = el.scrollWidth - el.clientWidth;
        const next = Math.min(el.scrollLeft + stepPx, max);
        if (max > 2) el.scrollTo({ left: next >= max - 2 ? 0 : next, behavior });
      }
      tick = window.setTimeout(run, intervalMs);
    };

    tick = window.setTimeout(run, intervalMs);
    return () => window.clearTimeout(tick);
  }, [enabled, el, intervalMs, stepPx, hovered, userPaused, idleResumeMs, behavior]);

  const markUserAction = useCallback(() => {
    lastUserAction.current = Date.now();
    setUserPaused(true);
  }, []);

  const scrollByDir = useCallback(
    (dir: -1 | 1) => {
      if (!el) return;
      markUserAction();
      el.scrollBy({ left: dir * stepPx, behavior });
    },
    [el, markUserAction, stepPx, behavior],
  );

  return { setTrack, userPaused, setUserPaused, setHovered, markUserAction, scrollByDir };
}

/** Swallows the click that ends a horizontal drag, so swiping a carousel does not open a card. */
export function useBlockClickOnDrag(thresholdPx = 10) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  return {
    onPointerDown: (e: PointerEvent) => {
      moved.current = false;
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e: PointerEvent) => {
      if (!start.current) return;
      if (Math.abs(e.clientX - start.current.x) > thresholdPx || Math.abs(e.clientY - start.current.y) > thresholdPx) {
        moved.current = true;
      }
    },
    onPointerUp: () => {
      start.current = null;
    },
    shouldBlockClick: () => moved.current,
  };
}
