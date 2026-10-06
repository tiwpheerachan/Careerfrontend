'use client';

import { Calendar } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cx } from '@/lib/cx';
import { ApplySelect } from './apply-select';
import { inputClass } from './field';

/** 'YYYY-MM' → { y, m }, or null. */
function parseYM(ym: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  return match ? { y: Number(match[1]), m: Number(match[2]) } : null;
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Month names in the page's language, Gregorian years (the Thai default would be Buddhist). */
function useMonthFormat() {
  const locale = useLocale();
  return useMemo(() => {
    const tag = `${locale === 'zh' ? 'zh-Hans' : locale}-u-ca-gregory`;
    const short = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: 'UTC' });
    const monthYear = new Intl.DateTimeFormat(tag, { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: short.format(Date.UTC(2000, i, 1)),
    }));
    const label = (ym: string) => {
      const p = parseYM(ym);
      return p ? monthYear.format(Date.UTC(p.y, p.m - 1, 1)) : '';
    };
    return { months, label };
  }, [locale]);
}

/**
 * A month + year picker (no day calendar): a button showing "Jan 2024" that
 * opens a popover with a Year and a Month select and Clear / This month /
 * Apply. The old hand-made dropdown, now a shadcn Popover.
 */
export function MonthYearPicker({
  id,
  value,
  onChange,
  placeholder,
  minYM,
  maxYM,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (ym: string) => void;
  placeholder: string;
  minYM?: string;
  maxYM?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const t = useTranslations('apply');
  const { months, label } = useMonthFormat();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => parseYM(value)?.y ?? new Date().getFullYear());
  const [month, setMonth] = useState(() => String(parseYM(value)?.m ?? new Date().getMonth() + 1).padStart(2, '0'));

  const years = useMemo(() => {
    const nowY = new Date().getFullYear();
    const minY = parseYM(minYM ?? '')?.y ?? nowY - 35;
    const maxY = parseYM(maxYM ?? '')?.y ?? nowY + 5;
    const list: number[] = [];
    for (let y = maxY; y >= minY; y--) list.push(y);
    return list;
  }, [minYM, maxYM]);

  function onOpenChange(next: boolean) {
    if (next) {
      // Start from the current value (or this month) each time it opens.
      const now = new Date();
      const p = parseYM(value);
      setYear(p?.y ?? now.getFullYear());
      setMonth(String(p?.m ?? now.getMonth() + 1).padStart(2, '0'));
    }
    setOpen(next);
  }

  function commit(ym: string) {
    onChange(ym);
    setOpen(false);
  }

  function apply() {
    const ym = `${year}-${month}`;
    if (minYM && ym < minYM) return commit(minYM);
    if (maxYM && ym > maxYM) return commit(maxYM);
    commit(ym);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={inputClass('flex w-full items-center justify-between gap-2', 'bg-white/85 text-left')}
        >
          <span className={cx('truncate', value ? 'text-slate-900' : 'text-slate-500')}>
            {value ? label(value) : placeholder}
          </span>
          <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="z-120 w-(--radix-popover-trigger-width) min-w-[260px] gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl ring-0"
      >
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">{t('picker.year')}</div>
              <ApplySelect
                small
                aria-label={t('picker.year')}
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
                options={years.map((y) => ({ value: String(y), label: String(y) }))}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-500">{t('picker.month')}</div>
              <ApplySelect
                small
                aria-label={t('picker.month')}
                value={month}
                onValueChange={setMonth}
                options={months}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => commit('')}>
              {t('picker.clear')}
            </button>

            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => commit(thisMonth())}>
                {t('picker.thisMonth')}
              </button>
              <button type="button" className="btn btn-primary" onClick={apply}>
                {t('picker.apply')}
              </button>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        <div className="px-3 py-2 text-[11px] text-slate-500">{t('picker.tip')}</div>
      </PopoverContent>
    </Popover>
  );
}

/** From / To pickers side by side; the end is kept on or after the start. */
export function MonthRange({
  idPrefix,
  fromLabel,
  toLabel,
  from,
  to,
  onChange,
  fromError,
  toError,
}: {
  idPrefix: string;
  fromLabel: string;
  toLabel: string;
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  fromError?: string;
  toError?: string;
}) {
  const t = useTranslations('apply');
  const fromId = `${idPrefix}-startMonth`;
  const toId = `${idPrefix}-endMonth`;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor={fromId} className="block text-xs font-semibold text-slate-600">
          {fromLabel}
        </label>
        <MonthYearPicker
          id={fromId}
          value={from}
          placeholder={t('picker.selectStart')}
          invalid={!!fromError}
          describedBy={fromError ? `${fromId}-error` : undefined}
          onChange={(v) => onChange({ from: v, to: v && to && to < v ? v : to })}
        />
        {fromError ? (
          <p id={`${fromId}-error`} className="text-[11px] font-medium text-rose-600">
            {fromError}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label htmlFor={toId} className="block text-xs font-semibold text-slate-600">
          {toLabel}
        </label>
        <MonthYearPicker
          id={toId}
          value={to}
          placeholder={t('picker.selectEnd')}
          minYM={from || undefined}
          invalid={!!toError}
          describedBy={toError ? `${toId}-error` : undefined}
          onChange={(v) => onChange({ from, to: v })}
        />
        {toError ? (
          <p id={`${toId}-error`} className="text-[11px] font-medium text-rose-600">
            {toError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
