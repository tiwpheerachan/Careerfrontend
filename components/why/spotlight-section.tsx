'use client';

import type { ReactNode } from 'react';

/**
 * The hero's <section>: tracks the pointer into --mx / --my so the spotlight
 * layer inside it (a radial gradient at var(--mx) var(--my)) follows the mouse.
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
