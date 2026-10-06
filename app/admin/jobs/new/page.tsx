import { getTranslations } from 'next-intl/server';
import { JobEditor } from '@/components/admin/jobs/job-editor';
import { store } from '@/lib/store';
import { requireAdminPage } from '@/lib/auth/admin';

export async function generateMetadata() {
  const t = await getTranslations('jobs.editor');
  const meta = await getTranslations('meta');
  return { title: `${t('titleNew')} · ${meta('title')}` };
}

/** A new job — the editor, empty, with the values already in use offered for department and level. */
export default async function NewJobPage() {
  await requireAdminPage();
  const options = await store().jobs.options();
  return <JobEditor job={null} options={options} />;
}
