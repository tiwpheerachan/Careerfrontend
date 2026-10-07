import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { JobEditor } from '@/components/admin/jobs/job-editor';
import { NotFoundError } from '@/lib/errors';
import { store } from '@/lib/store';
import { requireAdminPage } from '@/lib/auth/admin';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await store().jobs.get(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props) {
  await requireAdminPage({ resource: 'jobs', level: 'view' });
  const job = await load((await params).id);
  const meta = await getTranslations('meta');
  return { title: `${job.code} · ${meta('title')}` };
}

/** One job, in the editor. `id` is the job's public uuid. */
export default async function EditJobPage({ params }: Props) {
  await requireAdminPage({ resource: 'jobs', level: 'view' });
  const { id } = await params;
  const [job, options] = await Promise.all([load(id), store().jobs.options()]);
  return (
    <JobEditor
      // A fresh editor per job, so its form state never carries over between jobs.
      key={job.id}
      job={{
        id: job.id,
        code: job.code,
        publishState: job.publishState,
        countryCode: job.countryCode,
        department: job.department,
        level: job.level,
        quantity: job.quantity,
        applicantCount: job.applicantCount,
        translations: job.translations,
      }}
      options={options}
    />
  );
}
