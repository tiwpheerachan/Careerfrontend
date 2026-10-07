'use client';

import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useUrlSearch } from '@/lib/admin/search';

/**
 * The application forms' search box: searches as you type and clears with
 * the box, like the jobs and applicants lists (useUrlSearch). A new search
 * starts on page 1.
 */
export function FormsSearch({ q, placeholder }: { q: string; placeholder: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const search = useUrlSearch(
    q,
    (term) =>
      startTransition(() =>
        router.replace(
          term ? `/admin/applications/forms?${new URLSearchParams({ q: term })}` : '/admin/applications/forms',
          { scroll: false },
        ),
      ),
    !pending,
  );

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        search.flush();
      }}
      className="relative mb-4 max-w-md"
    >
      {pending ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      )}
      <input
        name="q"
        type="search"
        value={search.value}
        onChange={(e) => search.setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white pr-3 pl-9 text-sm outline-hidden placeholder:text-gray-400 focus:border-blue-600"
      />
    </form>
  );
}
