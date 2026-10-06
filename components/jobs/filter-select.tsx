'use client';

import type { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ALL = 'ALL';
const ITEM =
  'py-1.5 pl-2 text-white focus:bg-white/10 focus:text-white not-data-[variant=destructive]:focus:**:text-white';

/**
 * One glass filter in the Jobs hero — the old `SelectPill`, now a shadcn
 * Select. The trigger keeps the old native select's look (glass, white text,
 * chevron on the right); the list matches the old dark option colours.
 */
export function FilterSelect({
  label,
  allLabel,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  icon: ReactNode;
  /** '' = all. */
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-black text-white/90">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/25 bg-white/10">
          {icon}
        </span>
        {label}
      </div>

      <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
        <SelectTrigger
          aria-label={label}
          className={[
            'w-full min-h-[48px] data-[size=default]:h-auto',
            'rounded-2xl border-2 border-white/25',
            'bg-white/10 backdrop-blur-xs',
            'py-3 pr-3 pl-4',
            'text-sm font-semibold text-white',
            'cursor-pointer',
            'focus:border-orange-200 focus:ring-2 focus:ring-orange-200/30 focus:outline-hidden',
            'focus-visible:border-orange-200 focus-visible:ring-2 focus-visible:ring-orange-200/30',
            '[&_svg]:size-5! [&_svg]:text-white/70',
          ].join(' ')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="max-h-72 rounded-xl border-0 bg-[#1e293b] p-1 text-white ring-white/10"
        >
          <SelectItem value={ALL} className={ITEM}>
            {allLabel}
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className={ITEM}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
