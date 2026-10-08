import { CardSkeleton as Card } from '@/components/admin/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/** One applicant while it loads. */
export default function Loading() {
  return (
    <div aria-busy>
      <Skeleton className="mb-4 h-4 w-40 bg-gray-200/70" />
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-64 bg-gray-200/70" />
        <Skeleton className="h-4 w-96 max-w-full bg-gray-200/70" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card lines={2} />
          <Card lines={3} />
          <Card lines={1} />
        </div>
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <Skeleton className="h-4 w-24 bg-gray-200/70" />
            <Skeleton className="h-9 w-full rounded-xl bg-gray-200/70" />
            <Skeleton className="h-9 w-full rounded-xl bg-gray-200/70" />
          </div>
          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <Skeleton className="h-4 w-20 bg-gray-200/70" />
            <Skeleton className="h-12 w-full rounded-xl bg-gray-100" />
            <Skeleton className="h-12 w-full rounded-xl bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
