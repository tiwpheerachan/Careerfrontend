import { Briefcase } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeaderSkeleton, SearchSkeleton, TableSkeleton } from '@/components/admin/skeletons';

/** The jobs list while it loads. */
export default async function Loading() {
  const t = await getTranslations('jobs.list');
  return (
    <div aria-busy="true" className="[contain:inline-size]">
      <HeaderSkeleton icon={<Briefcase className="h-5 w-5" />} title={t('title')} action />
      <SearchSkeleton />
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
