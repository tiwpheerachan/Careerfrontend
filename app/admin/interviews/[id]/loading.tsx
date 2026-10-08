import { getTranslations } from 'next-intl/server';
import { FormPageSkeleton } from '@/components/admin/skeletons';

/** One evaluation while it loads. */
export default async function Loading() {
  const t = await getTranslations('interviews.form');
  return <FormPageSkeleton title={t('titleEdit')} aside={320} />;
}
