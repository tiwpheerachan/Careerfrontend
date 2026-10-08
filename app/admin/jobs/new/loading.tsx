import { Briefcase } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FormPageSkeleton } from '@/components/admin/skeletons';

/** A new job's editor while its options load. */
export default async function Loading() {
  const t = await getTranslations('jobs.editor');
  return <FormPageSkeleton icon={<Briefcase className="h-5 w-5" />} title={t('titleNew')} aside={340} />;
}
