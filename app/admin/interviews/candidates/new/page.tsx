import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AddCandidateForm } from '@/components/admin/interviews/add-candidate-form';
import { PageHeader } from '@/components/admin/ui';
import { requireAdminPage } from '@/lib/auth/admin';

export async function generateMetadata() {
  const t = await getTranslations('interviews.pending');
  const meta = await getTranslations('meta');
  return { title: `${t('title')} · ${meta('title')}` };
}

/**
 * /admin/interviews/candidates/new — a candidate interviewed before filling in
 * the application form: added here, invited and evaluated as anyone else, and
 * linked to their form once it comes in (migration 0013).
 */
export default async function AddCandidatePage() {
  await requireAdminPage({ resource: 'applications', level: 'edit' });
  const t = await getTranslations('interviews.pending');
  return (
    <div className="[contain:inline-size]">
      <Link
        href="/admin/interviews"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>
      <PageHeader icon={<UserPlus className="h-5 w-5" />} title={t('title')} subtitle={t('intro')} />
      <AddCandidateForm />
    </div>
  );
}
