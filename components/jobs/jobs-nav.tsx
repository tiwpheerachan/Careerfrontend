'use client';

import { createContext, use, useTransition, type ReactNode } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import { toQuery, type JobsQuery } from './jobs-query';

interface JobsNav {
  query: JobsQuery;
  /** True while the server renders the list for a new url. */
  pending: boolean;
  /** Merges `next` into the url (replacing history, as the old page did); the server re-renders the list. */
  update: (next: Partial<JobsQuery>) => void;
  /** Goes to a page of results and brings the list into view. */
  goToPage: (page: number) => void;
}

/** The element the list scrolls to when the page changes. */
const LIST_TOP_ID = 'open-positions';

const Context = createContext<JobsNav | null>(null);

export function useJobsNav(): JobsNav {
  const nav = use(Context);
  if (!nav) throw new Error('useJobsNav outside <JobsNavProvider>');
  return nav;
}

/**
 * The Jobs page's url state (q, country, department, level, page) shared by
 * the hero filters and the pagers. Filtering happens on the server: changing
 * the url re-renders the page, and `pending` covers the wait — the old page's
 * loading state.
 */
export function JobsNavProvider({ query, children }: { query: JobsQuery; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(next: Partial<JobsQuery>) {
    startTransition(() => {
      router.replace({ pathname: '/jobs', query: toQuery({ ...query, ...next }) }, { scroll: false });
    });
  }

  function goToPage(page: number) {
    update({ page });
    // Only when the visitor changes page — never on the first load (the old
    // page ran this on mount too and jumped past the hero).
    const el = document.getElementById(LIST_TOP_ID);
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const y = el.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }

  return <Context value={{ query, pending, update, goToPage }}>{children}</Context>;
}

/** Shows `fallback` while a new list is on its way, `children` otherwise. */
export function WhenSettled({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return useJobsNav().pending ? fallback : children;
}

/** The anchor the list scrolls to when the page changes. */
export function ListTop({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div id={LIST_TOP_ID} className={className}>
      {children}
    </div>
  );
}
