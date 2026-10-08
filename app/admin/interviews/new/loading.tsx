import { getTranslations } from 'next-intl/server';
import { FormPageSkeleton } from '@/components/admin/skeletons';

/** A new evaluation's form while it loads. */
export default async function Loading() {
  const t = await getTranslations('interviews.form');
  return <FormPageSkeleton title={t('titleNew')} aside={320} />;
}
