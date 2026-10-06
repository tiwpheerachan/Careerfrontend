'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import s from './apply.module.css';

export interface Option {
  value: string;
  label: string;
}

/**
 * shadcn Select dressed as the old `<select className="input">`. Radix cannot
 * hold an empty value, so "nothing chosen" is `''` outside and the
 * placeholder inside; `clearable` adds the placeholder as a choice (the old
 * `<option value="">`).
 */
export function ApplySelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  clearable,
  small,
  className,
  ...aria
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  clearable?: boolean;
  small?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}) {
  const NONE = '__none__';
  // The wrapper keeps Radix's hidden form <select> out of the parent's space-y spacing.
  return (
    <div className="min-w-0">
      <Select value={value || (clearable ? NONE : undefined)} onValueChange={(v) => onValueChange(v === NONE ? '' : v)}>
        <SelectTrigger
          id={id}
          {...aria}
          className={cn('input w-full', s.input, s.selectTrigger, small && s.selectTriggerSm, className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-200 rounded-xl">
          {clearable ? <SelectItem value={NONE}>{placeholder}</SelectItem> : null}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
