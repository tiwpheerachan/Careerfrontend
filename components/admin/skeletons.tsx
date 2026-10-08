import type { ReactNode } from 'react';
import { PageHeader } from '@/components/admin/ui';
import { Skeleton } from '@/components/ui/skeleton';

/*
 * The admin's pages in grey while they load (each page's loading.tsx): the real
 * header (icon and title, so the page is named at once), then its cards and
 * tables in outline, laid out as the page itself.
 */

const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-xs';

/** A subtitle in grey — a span, as it sits in PageHeader's <p>. */
export function SubtitleSkeleton({ className = 'w-48' }: { className?: string }) {
  return <span className={`inline-block h-4 animate-pulse rounded-md bg-muted align-middle ${className}`} />;
}

/** PageHeader with a grey subtitle (and actions, when the page has a button there). */
export function HeaderSkeleton({ icon, title, action = false }: { icon?: ReactNode; title: string; action?: boolean }) {
  return (
    <PageHeader
      icon={icon}
      title={title}
      subtitle={<SubtitleSkeleton />}
      actions={action ? <Skeleton className="h-[38px] w-36 rounded-xl" /> : undefined}
    />
  );
}

/** "← Back" above a page. */
export function BackSkeleton() {
  return <Skeleton className="mb-4 h-4 w-40" />;
}

/** A search box and its button above a list. */
export function SearchSkeleton() {
  return (
    <div className="mb-4 flex gap-2">
      <Skeleton className="h-10 max-w-md flex-1 rounded-xl" />
      <Skeleton className="h-10 w-20 rounded-xl" />
    </div>
  );
}

/** A list's table: a header strip, then rows — a two-line first cell and `cols - 1` more. */
export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <Skeleton className="h-3 w-1/2" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-gray-100 px-4 py-4 last:border-0">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {Array.from({ length: cols - 1 }, (_, j) => (
            <Skeleton key={j} className="hidden h-4 w-20 sm:block" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A card of label/value pairs, two to a row. */
export function CardSkeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`${card} ${className}`}>
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: lines * 2 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The two columns of the job editor (340px aside) and the evaluation form (320px) — literal, for Tailwind. */
const FORM_COLUMNS = {
  320: 'lg:grid-cols-[minmax(0,1fr)_320px]',
  340: 'lg:grid-cols-[minmax(0,1fr)_340px]',
};

/** A form page (the job editor, an evaluation): back, header, cards, and the summary aside. */
export function FormPageSkeleton({ icon, title, aside }: { icon?: ReactNode; title: string; aside: 320 | 340 }) {
  return (
    <div aria-busy="true">
      <BackSkeleton />
      <HeaderSkeleton icon={icon} title={title} />
      <div className={`grid gap-6 ${FORM_COLUMNS[aside]}`}>
        <div className="min-w-0 space-y-6">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
        </div>
        <div className={`${card} space-y-3 self-start`}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
