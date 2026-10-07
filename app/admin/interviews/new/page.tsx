import { getTranslations } from 'next-intl/server';
import { EvaluationForm, type Prefill } from '@/components/admin/interviews/evaluation-form';
import { requireAdminPage } from '@/lib/auth/admin';
import { parseCandidateKey } from '@/lib/interview/candidate-key';
import { store } from '@/lib/store';

export async function generateMetadata() {
  const t = await getTranslations('interviews.form');
  const meta = await getTranslations('meta');
  return { title: `${t('titleNew')} · ${meta('title')}` };
}

/** Today in Bangkok, YYYY-MM-DD — the interview date the form starts with. */
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());

/** The candidate a new evaluation starts with: ?candidate=application:<id> | form:<id> | name:<name>. */
async function prefillFrom(key: string | undefined): Promise<Prefill | undefined> {
  const ref = key ? parseCandidateKey(key) : undefined;
  if (!ref) return undefined;
  if (ref.kind === 'manual') return { link: null, name: ref.name, position: null, department: null };
  const found = await store().interviewEvaluations.candidate(ref.kind, ref.id);
  return found
    ? {
        link: { kind: ref.kind, id: found.id },
        name: found.name,
        position: found.position,
        department: found.department,
      }
    : undefined;
}

/** /admin/interviews/new — evaluate one round of one candidate's interview. */
export default async function NewEvaluationPage({ searchParams }: PageProps<'/admin/interviews/new'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'edit' });
  const { candidate } = await searchParams;
  const key = typeof candidate === 'string' ? candidate : undefined;
  const prefill = await prefillFrom(key);
  return (
    <EvaluationForm
      // Started from a candidate's page: back (and a save) goes there.
      backHref={prefill && key ? `/admin/interviews/candidate/${encodeURIComponent(key)}` : undefined}
      evaluation={null}
      today={today()}
      evaluator={actor.name || actor.email}
      readOnly={false}
      prefill={prefill}
    />
  );
}
