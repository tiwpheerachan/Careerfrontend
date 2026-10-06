'use client';

import { Loader2, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { JobPublishState } from '@/lib/constants-types';
import { PUBLISH_STATES, stateToParam } from './job-utils';

const SEARCH_DELAY = 250;

/**
 * The search box and the status chips above the jobs table. Both write to the
 * url (?q=, ?state=) and the server page re-reads; the search waits 250ms
 * after the last key, as the old one did.
 */
export function JobsToolbar({
  q,
  state,
  counts,
}: {
  q: string;
  state: JobPublishState | undefined;
  counts: Record<JobPublishState | 'all', number>;
}) {
  const t = useTranslations('jobs.list');
  const common = useTranslations('common');
  const publishState = useTranslations('publishState');
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(q);
  const sent = useRef(q);

  // The url changed from elsewhere ("clear filters", back button): show it.
  useEffect(() => {
    if (q !== sent.current) {
      sent.current = q;
      setValue(q);
    }
  }, [q]);

  const navigate = (patch: { q?: string; state?: string }) => {
    const current = { q: sent.current || undefined, state: state ? stateToParam(state) : undefined };
    const next = new URLSearchParams();
    for (const [key, val] of Object.entries({ ...current, ...patch })) if (val) next.set(key, val);
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    const term = value.trim();
    if (term === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = term;
      navigate({ q: term || undefined });
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
    // navigate is rebuilt every render; the value is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const chip =
    'h-auto min-w-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-normal text-gray-700 hover:bg-gray-50 hover:text-gray-700 data-[state=on]:border-blue-600 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700';
  const count =
    'ml-0.5 rounded-full bg-gray-100 px-1.5 text-[11px] leading-4 font-semibold text-gray-500 tabular-nums group-data-[state=on]/toggle:bg-blue-100 group-data-[state=on]/toggle:text-blue-700';

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        {pending ? (
          <Loader2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <Input
          type="search"
          aria-label={common('search')}
          placeholder={t('searchPlaceholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-auto rounded-xl border-gray-200 bg-white py-2 pr-3 pl-9 text-sm focus-visible:border-blue-600 focus-visible:ring-0"
        />
      </div>
      <ToggleGroup
        type="single"
        spacing={2}
        aria-label={t('stateFilter')}
        value={state ? stateToParam(state) : 'all'}
        onValueChange={(next) => next && navigate({ state: next === 'all' ? undefined : next })}
        className="flex-wrap"
      >
        <ToggleGroupItem value="all" className={chip}>
          {common('all')}
          <span className={count}>{counts.all}</span>
        </ToggleGroupItem>
        {PUBLISH_STATES.map((s) => (
          <ToggleGroupItem key={s} value={stateToParam(s)} className={chip}>
            {publishState(s)}
            <span className={count}>{counts[s]}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
