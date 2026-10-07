'use client';

import { useEffect, useRef, useState } from 'react';

/** How long the search waits after the last key before it goes to the url. */
export const SEARCH_DELAY = 250;

/**
 * A list's search box that searches as you type: the box's own value, sent to
 * the url (`onSearch(term)`) 250ms after the last key, trimmed — an emptied
 * box clears the search. Every admin list searches this way (jobs, applicants,
 * application forms).
 *
 *   const search = useUrlSearch(q, (term) => router.replace(hrefWith({ q: term })), !pending);
 *   <input value={search.value} onChange={(e) => search.setValue(e.target.value)} />
 *
 * `q` is the search the url has now. When it changes from elsewhere (Back,
 * "clear filters") the box follows — but only once the list has `settled`
 * (no navigation of its own in flight), so a late answer to an older
 * navigation never puts old text back into the box.
 * `flush()` sends what is typed now (Enter).
 */
export function useUrlSearch(q: string, onSearch: (term: string) => void, settled = true) {
  const [value, setValue] = useState(q);
  const sent = useRef(q);
  const send = useRef(onSearch);
  useEffect(() => {
    send.current = onSearch;
  });

  useEffect(() => {
    if (settled && q !== sent.current) {
      sent.current = q;
      setValue(q);
    }
  }, [q, settled]);

  useEffect(() => {
    const term = value.trim();
    if (term === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = term;
      send.current(term);
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [value]);

  const flush = () => {
    const term = value.trim();
    if (term === sent.current) return;
    sent.current = term;
    send.current(term);
  };

  return { value, setValue, flush };
}

/**
 * The list's url state as last asked for. Filters change it one piece at a
 * time (a chip, then the search 250ms later…) and the page's props only catch
 * up when the server answers, so each change starts from this — not from
 * props that may still be one navigation behind. While nothing is in flight
 * (`settled`) the props are the truth again.
 */
export function useRequestedState<T>(fromUrl: T, settled: boolean) {
  const requested = useRef(fromUrl);
  useEffect(() => {
    if (settled) requested.current = fromUrl;
  });
  return requested;
}
