import { UserRound } from 'lucide-react';
import { BackSkeleton, SubtitleSkeleton, TableSkeleton } from '@/components/admin/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

const card = 'mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs';

/** One candidate while it loads: the summary, the links and the evaluations, in outline. */
export default function Loading() {
  return (
    <div aria-busy="true" className="[contain:inline-size]">
      <BackSkeleton />
      {/* PageHeader's shape: the name is not known yet. */}
      <div className="mb-6 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-7 w-56" />
          <SubtitleSkeleton className="w-64" />
        </div>
      </div>

      <div className={card}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1.5 h-3 w-80 max-w-full" />
        <div className="mt-4 flex flex-wrap gap-8 rounded-xl bg-gray-50 p-4">
          <Skeleton className="h-10 w-24" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>

      <div className={card}>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-1.5 mb-4 h-3 w-96 max-w-full" />
        <TableSkeleton rows={3} cols={5} />
      </div>

      <div className={card}>
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-1.5 mb-4 h-3 w-80 max-w-full" />
        <TableSkeleton rows={4} cols={5} />
      </div>
    </div>
  );
}
