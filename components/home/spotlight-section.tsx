'use client';

import type { ReactNode } from 'react';

/**
 * The hero's <section>: follows the mouse and writes its position to --mx/--my,
 * which the spotlight gradient reads. The listener is on the section itself
 * (React removes it with the element).
 */
export function SpotlightSection({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={className}
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      {children}
    </section>
  );
}
