import { getTranslations } from 'next-intl/server';
import { EvaluationForm } from '@/components/admin/interviews/evaluation-form';
import { requireAdminPage } from '@/lib/auth/admin';

export async function generateMetadata() {
  const t = await getTranslations('interviews.form');
  const meta = await getTranslations('meta');
  return { title: `${t('titleNew')} · ${meta('title')}` };
}

/** Today in Bangkok, YYYY-MM-DD — the interview date the form starts with. */
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());

/** /admin/interviews/new — evaluate one round of one candidate's interview. */
export default async function NewEvaluationPage() {
  const actor = await requireAdminPage({ resource: 'applications', level: 'edit' });
  return <EvaluationForm evaluation={null} today={today()} evaluator={actor.name || actor.email} readOnly={false} />;
}
