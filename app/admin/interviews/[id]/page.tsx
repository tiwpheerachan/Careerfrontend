import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EvaluationForm } from '@/components/admin/interviews/evaluation-form';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import { NotFoundError } from '@/lib/errors';
import { store } from '@/lib/store';

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await store().interviewEvaluations.get(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Props) {
  await requireAdminPage({ resource: 'applications', level: 'view' });
  const evaluation = await load((await params).id);
  const meta = await getTranslations('meta');
  return { title: `${evaluation.candidate.name} · ${meta('title')}` };
}

/**
 * /admin/interviews/{id} — one evaluation. Editable by its evaluator (with
 * edit) or by manage; read-only for everyone else (the API checks the same).
 */
export default async function EvaluationPage({ params }: Props) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const evaluation = await load((await params).id);
  const can = abilitiesOf(actor).applications;
  const own = evaluation.evaluator.email.toLowerCase() === actor.email.toLowerCase();
  const editable = can.manage || (can.edit && own);
  return (
    <EvaluationForm
      evaluation={evaluation}
      today={evaluation.interviewDate}
      evaluator={evaluation.evaluator.name || evaluation.evaluator.email}
      readOnly={!editable}
    />
  );
}
