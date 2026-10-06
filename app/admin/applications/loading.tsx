import { Skeleton } from '@/components/ui/skeleton';

/** The applicants list while it loads: header, filters and table rows in outline. */
export default function Loading() {
  return (
    <div aria-busy className="[contain:inline-size]">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 rounded-2xl bg-gray-200/70" />
          <div className="space-y-2 pt-1">
            <Skeleton className="h-6 w-28 bg-gray-200/70" />
            <Skeleton className="h-4 w-24 bg-gray-200/70" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-xl bg-gray-200/70" />
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <Skeleton className="h-9 rounded-xl bg-gray-200/70 md:min-w-64 md:flex-1" />
        <Skeleton className="h-9 w-full rounded-xl bg-gray-200/70 md:w-72" />
        <div className="flex flex-wrap gap-2">
          {[64, 56, 96, 64, 64, 96].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-full bg-gray-200/70" style={{ width: w }} />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <Skeleton className="h-3 w-1/2 bg-gray-200/70" />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-gray-100 px-4 py-4 last:border-0">
            <Skeleton className="h-4 w-28 bg-gray-200/70" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3 bg-gray-200/70" />
              <Skeleton className="h-3 w-1/2 bg-gray-100" />
            </div>
            <div className="hidden w-48 space-y-1.5 md:block">
              <Skeleton className="h-4 w-full bg-gray-200/70" />
              <Skeleton className="h-3 w-2/3 bg-gray-100" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full bg-gray-200/70" />
            <Skeleton className="hidden h-4 w-28 bg-gray-200/70 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
