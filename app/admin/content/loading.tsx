import { FileText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SubtitleSkeleton } from '@/components/admin/skeletons';
import { PageHeader } from '@/components/admin/ui';
import { Skeleton } from '@/components/ui/skeleton';

/** The editor's layout in grey while the site's text and overrides load. */
export default async function ContentLoading() {
  const t = await getTranslations('content');
  return (
    <div aria-busy="true" className="mx-auto max-w-5xl">
      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        title={t('title')}
        subtitle={<SubtitleSkeleton className="w-64" />}
        actions={<Skeleton className="h-[38px] w-48 rounded-xl" />}
      />
      <div className="py-2">
        <Skeleton className="h-[38px] w-full rounded-xl" />
        <Skeleton className="mt-2 h-3 w-32" />
      </div>
      <div className="mt-1 space-y-2">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xs"
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
