import { ClipboardCheck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeaderSkeleton, SearchSkeleton, TableSkeleton } from '@/components/admin/skeletons';

/** The interviews list while it loads. */
export default async function Loading() {
  const t = await getTranslations('interviews.list');
  return (
    <div aria-busy="true" className="[contain:inline-size]">
      <HeaderSkeleton icon={<ClipboardCheck className="h-5 w-5" />} title={t('title')} action />
      <SearchSkeleton />
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
