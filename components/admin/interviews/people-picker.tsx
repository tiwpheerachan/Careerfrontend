'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { AdminApiError, adminFetch } from '@/lib/admin/client';
import { cn } from '@/lib/utils';
import { FIELD } from './fields';

export interface PickedPerson {
  unionId: string | null;
  name: string;
  enName: string | null;
  email: string;
  jobTitle: string | null;
  department: string | null;
}

/**
 * Several people from the company directory (GET /admin/people), shown as
 * chips. Picking, not typing an email: a mistyped address would let nobody in
 * and say nothing about it.
 */
export function PeoplePicker({
  value,
  onChange,
  invalid,
}: {
  value: PickedPerson[];
  onChange: (people: PickedPerson[]) => void;
  invalid?: boolean;
}) {
  const t = useTranslations('interviews.invite');
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ticket = ++latest.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setProblem(null);
      try {
        const body = await adminFetch<{ people: PickedPerson[] }>(`/people?${new URLSearchParams({ q })}`);
        if (ticket !== latest.current) return;
        setResults(body.people);
        setActive(0);
        setOpen(true);
      } catch (error) {
        if (ticket !== latest.current) return;
        setResults([]);
        setProblem(error instanceof AdminApiError && error.status === 503 ? t('directoryOff') : t('directoryFailed'));
      } finally {
        if (ticket === latest.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, t]);

  const chosen = new Set(value.map((p) => p.email));
  const shown = results.filter((p) => !chosen.has(p.email));

  const pick = (person: PickedPerson) => {
    onChange([...value, person]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !shown.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % shown.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + shown.length) % shown.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(shown[Math.min(active, shown.length - 1)]!);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((person) => (
            <li
              key={person.email}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pr-1 pl-3 text-xs font-semibold text-blue-800 ring-1 ring-blue-200"
            >
              <span title={person.email}>{person.name}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((p) => p.email !== person.email))}
                aria-label={t('remove', { name: person.name })}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-blue-100"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={t('searchPeople')}
          aria-invalid={invalid || undefined}
          aria-activedescendant={showList && shown.length ? `${listId}-${active}` : undefined}
          value={query}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setOpen(false);
          }}
          onFocus={() => shown.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className={cn(FIELD, 'pl-9')}
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
          >
            {shown.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">{loading ? t('searching') : t('noMatch')}</li>
            ) : (
              shown.map((person, i) => (
                <li
                  key={person.email}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(person);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'cursor-pointer rounded-lg px-3 py-2 text-sm',
                    i === active ? 'bg-blue-50 text-blue-900' : 'text-gray-800',
                  )}
                >
                  <div className="font-semibold">
                    {person.name}
                    {person.enName && person.enName !== person.name ? (
                      <span className="ml-1 font-normal text-gray-500">({person.enName})</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {[person.jobTitle, person.department, person.email].filter(Boolean).join(' · ')}
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {problem && <p className="mt-1.5 text-xs font-medium text-red-600">{problem}</p>}
    </div>
  );
}
