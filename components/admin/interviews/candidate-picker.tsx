'use client';

import { Loader2, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/admin/client';
import { cn } from '@/lib/utils';
import type { PastEvaluation } from '@/lib/repositories/interview-evaluations';
import { FIELD } from './fields';

export interface PickedCandidate {
  kind: 'application' | 'form';
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  email: string;
  /** Their evaluations so far (shown once picked; they suggest the round). */
  evaluated: PastEvaluation[];
}

/**
 * "Who is being evaluated": type a name, email or phone, pick from the
 * applicants and application forms that match (GET /admin/interview-candidates).
 * A combobox — arrows move, Enter picks, Escape closes.
 */
export function CandidatePicker({
  onPick,
  inputId,
  error,
}: {
  onPick: (candidate: PickedCandidate) => void;
  inputId?: string;
  /** Shown under the box (no candidate yet, with the details hidden). */
  error?: string;
}) {
  const t = useTranslations('interviews.form');
  const listId = useId();
  const id = inputId ?? `${listId}-input`;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const latest = useRef(0);

  // Asked 250 ms after the last keystroke; only the newest answer is shown.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const body = await adminFetch<{ candidates: PickedCandidate[] }>(
          `/interview-candidates?${new URLSearchParams({ q })}`,
        );
        if (ticket !== latest.current) return;
        setResults(body.candidates);
        setActive(0);
        setOpen(true);
      } catch {
        if (ticket === latest.current) setResults([]);
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (candidate: PickedCandidate) => {
    onPick(candidate);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(results[active]!);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {t('search')}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results.length ? `${listId}-${active}` : undefined}
          value={query}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setOpen(false);
          }}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          aria-invalid={!!error || undefined}
          className={cn(FIELD, 'pl-9')}
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">{loading ? t('searching') : t('noMatch')}</li>
          ) : (
            results.map((candidate, i) => (
              <li
                key={`${candidate.kind}:${candidate.id}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(candidate);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-2 text-sm',
                  i === active ? 'bg-blue-50 text-blue-900' : 'text-gray-800',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{candidate.name}</span>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                    {t(`kinds.${candidate.kind}`)}
                  </span>
                </div>
                <div className="truncate text-xs text-gray-500">
                  {[candidate.position, candidate.department, candidate.email].filter(Boolean).join(' · ')}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
