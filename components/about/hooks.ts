'use client';

import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** True when the visitor asked the OS for less motion. False on the server (and in the first client render). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Counts 0 → target with an ease-out over `ms`; with reduced motion the target is shown at once. */
export function useCountTo(target: number, ms = 820): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.max(0, Math.min(target, Math.round(target * eased))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduced]);

  return reduced ? target : value;
}

/** True while the element is in, or within 200px of, the viewport. False on the server. */
export function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setOnScreen(entries.at(-1)?.isIntersecting ?? false), {
      rootMargin: '200px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  return onScreen;
}

/** Alternates between true and false every `intervalMs` while `active` (stays true with reduced motion). */
export function useAlternate(intervalMs: number, active: boolean): boolean {
  const reduced = usePrefersReducedMotion();
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (reduced || !active) return;
    const timer = window.setInterval(() => setOn((v) => !v), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, active, reduced]);

  return reduced || on;
}
