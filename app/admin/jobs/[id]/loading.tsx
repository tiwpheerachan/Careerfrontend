import { Briefcase } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { FormPageSkeleton } from '@/components/admin/skeletons';

/** A job in the editor while it loads. */
export default async function Loading() {
  const t = await getTranslations('jobs.editor');
  return <FormPageSkeleton icon={<Briefcase className="h-5 w-5" />} title={t('titleEdit')} aside={340} />;
}
