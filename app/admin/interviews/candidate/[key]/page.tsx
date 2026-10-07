import { ArrowLeft, ChevronRight, FileDown, Mail, Plus, UserRound } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { InvitationsPanel } from '@/components/admin/interviews/invitations-panel';
import { PageHeader, ToneBadge, type Tone } from '@/components/admin/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/admin/format';
import { requestOrigin } from '@/lib/api/origin';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import { EVALUATOR_ROLES } from '@/lib/constants';
import type { AdminLocale } from '@/lib/i18n/admin';
import { parseCandidateKey } from '@/lib/interview/candidate-key';
import { store } from '@/lib/store';

const RESULT_TONE: Record<'PENDING' | 'PASS' | 'FAIL', Tone> = { PENDING: 'amber', PASS: 'emerald', FAIL: 'red' };
const PDF_LANGUAGES = ['th', 'en', 'zh'] as const;

type Props = PageProps<'/admin/interviews/candidate/[key]'>;

/** Who the key is, and everything about them — or a 404. */
async function load(rawKey: string) {
  const key = decodeURIComponent(rawKey);
  const ref = parseCandidateKey(key);
  if (!ref) notFound();
  const [evaluations, invitations, linked] = await Promise.all([
    store().interviewEvaluations.forCandidate(ref),
    store().interviewInvitations.forCandidate(ref),
    ref.kind === 'manual' ? undefined : store().interviewEvaluations.candidate(ref.kind, ref.id),
  ]);
  // Who it is: the applicant / form itself (its name is the real one), else
  // the newest evaluation's copy, else the newest invitation's.
  const latestEvaluation = [...evaluations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  const who =
    (linked && {
      kind: linked.kind,
      id: linked.id,
      name: linked.name,
      position: linked.position,
      department: linked.department,
    }) ??
    latestEvaluation?.candidate ??
    invitations[0]?.candidate;
  if (!who) notFound();
  return { key, ref, evaluations, invitations, who };
}

export async function generateMetadata({ params }: Props) {
  await requireAdminPage({ resource: 'applications', level: 'view' });
  const { who } = await load((await params).key);
  const meta = await getTranslations('meta');
  return { title: `${who.name} · ${meta('title')}` };
}

/**
 * /admin/interviews/candidate/{key} — one candidate: every round from every
 * evaluator, and the paper form per side (HR / the department) as a PDF.
 * `key` is application:<id>, form:<id> or name:<name> (lib/interview/candidate-key.ts).
 */
export default async function CandidateEvaluationsPage({ params }: Props) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const { key, ref, evaluations, invitations, who } = await load((await params).key);
  const origin = requestOrigin(new Request('http://localhost', { headers: await headers() }));

  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('interviews.candidate');
  const tf = await getTranslations('interviews.form');
  const tl = await getTranslations('interviews.list');
  const pdfHref = (role: string, lang: string) =>
    `/api/v1/admin/interview-evaluations/pdf?${new URLSearchParams({ candidate: key, role, lang })}`;

  return (
    <div className="[contain:inline-size]">
      <Link
        href="/admin/interviews"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </Link>
      <PageHeader
        icon={<UserRound className="h-5 w-5" />}
        title={who.name}
        subtitle={[who.position, who.department].filter(Boolean).join(' · ') || t('subtitle')}
        actions={
          abilitiesOf(actor).applications.edit && (
            <Link
              href={`/admin/interviews/new?candidate=${encodeURIComponent(key)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> {t('evaluateMore')}
            </Link>
          )
        }
      />

      <InvitationsPanel
        candidate={{
          applicationId: ref.kind === 'application' ? ref.id : null,
          applicationFormId: ref.kind === 'form' ? ref.id : null,
          name: who.name,
          position: who.position,
          department: who.department,
        }}
        invitations={invitations.map(({ token, ...inv }) => ({
          ...inv,
          link: `${origin}/evaluate/${token}`,
          createdAt: inv.createdAt.toISOString(),
          expiresAt: inv.expiresAt.toISOString(),
          invitees: inv.invitees.map((p) => ({
            ...p,
            openedAt: p.openedAt?.toISOString() ?? null,
            submittedAt: p.submittedAt?.toISOString() ?? null,
          })),
        }))}
      />

      {/* One paper form per side */}
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900">{t('pdfTitle')}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{t('pdfHint')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {EVALUATOR_ROLES.map((role) => {
            const has = evaluations.some((e) => e.evaluatorRole === role);
            return (
              <div key={role} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <FileDown className="h-4 w-4 text-blue-600" />
                  {t(`pdfFor.${role}`)}
                </div>
                {has ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PDF_LANGUAGES.map((lang) => (
                      <a
                        key={lang}
                        href={pdfHref(role, lang)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        PDF · {t(`languages.${lang}`)}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400">{t('noneYet')}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {evaluations.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-500">{t('empty')}</p>
        ) : (
          <>
            {/* Phones: one card per evaluation, the whole card opens it. */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {evaluations.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/interviews/${e.id}?from=candidate`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{tf(`rounds.${e.round}`)}</span>
                        <ToneBadge tone={RESULT_TONE[e.result]}>{tf(`results.${e.result}`)}</ToneBadge>
                        {e.viaInvitation && (
                          <Mail className="h-3.5 w-3.5 text-violet-600" aria-label={tf('viaInvitation')} />
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">
                        {e.evaluator.name || e.evaluator.email} · {tf(`roles.${e.evaluatorRole}`)}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        <span className="font-semibold text-gray-800">
                          {e.total}/{e.max}
                        </span>{' '}
                        · {formatDate(e.interviewDate, locale)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Table className="hidden text-left md:table">
              <TableHeader className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase [&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3">{tl('columns.round')}</TableHead>
                  <TableHead className="px-4 py-3">{tl('columns.evaluator')}</TableHead>
                  <TableHead className="px-4 py-3">{tl('columns.score')}</TableHead>
                  <TableHead className="px-4 py-3">{tl('columns.result')}</TableHead>
                  <TableHead className="px-4 py-3">{tl('columns.date')}</TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    <span className="sr-only">{tl('columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((e) => (
                  <TableRow key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="px-4 py-3 font-semibold text-gray-800">{tf(`rounds.${e.round}`)}</TableCell>
                    <TableCell className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-1.5">
                        {e.evaluator.name || e.evaluator.email}
                        {e.viaInvitation && (
                          <Mail className="h-3.5 w-3.5 text-violet-600" aria-label={tf('viaInvitation')} />
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{tf(`roles.${e.evaluatorRole}`)}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {e.total}/{e.max}
                      </span>
                      <span className={e.meetsPassMark ? 'ml-2 text-xs text-emerald-700' : 'ml-2 text-xs text-red-600'}>
                        {e.meetsPassMark ? tf('meets') : tf('notMeets')}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <ToneBadge tone={RESULT_TONE[e.result]}>{tf(`results.${e.result}`)}</ToneBadge>
                      {e.result === 'FAIL' && e.failReason && (
                        <div className="mt-1 text-xs text-gray-500">{e.failReason}</div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {formatDate(e.interviewDate, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/interviews/${e.id}?from=candidate`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        {t('open')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>
    </div>
  );
}
