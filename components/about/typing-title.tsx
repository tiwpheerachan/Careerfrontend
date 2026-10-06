'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from './hooks';
import styles from './typing-title.module.css';

type Phase = { out: string; mode: 'typing' | 'deleting' };

/**
 * An <h2> that types its text, pauses, deletes it and starts again. Screen
 * readers (and the server-rendered HTML) get the whole text; with reduced
 * motion the whole text is shown, without the caret.
 */
export function TypingTitle({
  text,
  className,
  pauseMs = 900,
  deleteMs = 420,
  typeSpeed = 70,
  deleteSpeed = 45,
}: {
  text: string;
  className?: string;
  pauseMs?: number;
  deleteMs?: number;
  typeSpeed?: number;
  deleteSpeed?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [{ out, mode }, setPhase] = useState<Phase>({ out: '', mode: 'typing' });

  useEffect(() => {
    if (reduced) return;
    let delay = typeSpeed;
    let next: Phase = { out: text.slice(0, out.length + 1), mode };
    if (mode === 'typing' && out.length >= text.length) {
      // Typed out: hold for pauseMs, then start deleting.
      delay = pauseMs;
      next = { out, mode: 'deleting' };
    } else if (mode === 'deleting') {
      // Deleted: hold for deleteMs, then type again.
      delay = out.length > 0 ? deleteSpeed : deleteMs;
      next = out.length > 0 ? { out: out.slice(0, -1), mode } : { out: '', mode: 'typing' };
    }
    const timer = window.setTimeout(() => setPhase(next), delay);
    return () => window.clearTimeout(timer);
  }, [reduced, out, mode, text, pauseMs, deleteMs, typeSpeed, deleteSpeed]);

  return (
    <h2 className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {reduced ? (
          text
        ) : (
          <>
            {out}
            <span className={styles.caret}>|</span>
          </>
        )}
      </span>
    </h2>
  );
}
