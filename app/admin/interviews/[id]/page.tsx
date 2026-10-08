import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EditLink } from '@/components/admin/interviews/edit-link';
import { EvaluationForm } from '@/components/admin/interviews/evaluation-form';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import { candidateKey } from '@/lib/interview/candidate-key';
import { NotFoundError } from '@/lib/errors';
import { store } from '@/lib/store';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
 * /admin/interviews/{id} — one evaluation: one evaluator's one round, read
 * only for everyone. To change it, someone with edit makes an edit link for
 * its evaluator; manage may delete it (and invite its evaluator again).
 */
export default async function EvaluationPage({ params, searchParams }: Props) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const evaluation = await load((await params).id);
  const can = abilitiesOf(actor).applications;
  const who = evaluation.evaluator.name || evaluation.evaluator.email;
  // ?from=candidate: opened from the candidate's page, so back goes there (a flag, never a url).
  const fromCandidate = (await searchParams).from === 'candidate';
  return (
    <EvaluationForm
      backHref={
        fromCandidate
          ? `/admin/interviews/candidate/${encodeURIComponent(candidateKey(evaluation.candidate))}`
          : undefined
      }
      evaluation={evaluation}
      today={evaluation.interviewDate}
      evaluator={who}
      readOnly
      editLink={can.edit ? <EditLink evaluationId={evaluation.id} who={who} /> : undefined}
      canDelete={can.manage}
    />
  );
}
