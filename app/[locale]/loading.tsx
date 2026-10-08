import { Skeleton } from '@/components/ui/skeleton';

/**
 * Any public page while it loads — a click shows this at once instead of
 * nothing for seconds. The hero band and content blocks in grey; at least a
 * screen tall, so the footer stays out of view and the swap moves nothing on
 * screen (layout shift stays 0).
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="min-h-[100svh]">
      <Skeleton className="h-[420px] w-full rounded-none sm:h-[520px]" />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
