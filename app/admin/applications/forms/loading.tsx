import { ClipboardList } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeaderSkeleton, SearchSkeleton, TableSkeleton } from '@/components/admin/skeletons';

/** The application forms list while it loads (its own: the applicants' one would show otherwise). */
export default async function Loading() {
  const t = await getTranslations('applications.forms');
  return (
    <div aria-busy="true" className="[contain:inline-size]">
      <HeaderSkeleton icon={<ClipboardList className="h-5 w-5" />} title={t('title')} />
      <SearchSkeleton />
      <TableSkeleton rows={8} cols={4} />
    </div>
  );
}
