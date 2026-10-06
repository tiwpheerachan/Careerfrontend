'use client';

import { ChevronRight } from 'lucide-react';
import { cx } from '@/lib/cx';

export function BackToTop({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-sm font-black',
        'bg-white/75 text-slate-900',
        'transition hover:-translate-y-0.5 active:scale-[0.98]',
      )}
    >
      {label} <ChevronRight className="h-4 w-4 -rotate-90" />
    </button>
  );
}
