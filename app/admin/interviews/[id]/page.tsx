import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
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
 * /admin/interviews/{id} — one evaluation. Editable by its evaluator (with
 * edit) or by manage; read-only for everyone else, and for everyone when it
 * was sent through an invitation link (the API checks the same).
 */
export default async function EvaluationPage({ params, searchParams }: Props) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const evaluation = await load((await params).id);
  const can = abilitiesOf(actor).applications;
  const own = evaluation.evaluator.email.toLowerCase() === actor.email.toLowerCase();
  // Sent through an invitation link: nobody changes it (the API refuses too); manage may delete it.
  const locked = evaluation.viaInvitation;
  const editable = !locked && (can.manage || (can.edit && own));
  const access = locked ? 'locked' : !editable ? 'other' : own ? 'own' : 'manage';
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
      evaluator={evaluation.evaluator.name || evaluation.evaluator.email}
      readOnly={!editable}
      access={access}
      canDelete={can.manage}
    />
  );
}
