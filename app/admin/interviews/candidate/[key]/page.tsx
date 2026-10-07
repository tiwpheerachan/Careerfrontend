import { ArrowLeft, FileDown, Plus, UserRound } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageHeader, ToneBadge, type Tone } from '@/components/admin/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/admin/format';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import { EVALUATOR_ROLES } from '@/lib/constants';
import type { AdminLocale } from '@/lib/i18n/admin';
import { parseCandidateKey } from '@/lib/interview/candidate-key';
import { store } from '@/lib/store';

const RESULT_TONE: Record<'PENDING' | 'PASS' | 'FAIL', Tone> = { PENDING: 'amber', PASS: 'emerald', FAIL: 'red' };
const PDF_LANGUAGES = ['th', 'en', 'zh'] as const;

/**
 * /admin/interviews/candidate/{key} — one candidate: every round from every
 * evaluator, and the paper form per side (HR / the department) as a PDF.
 * `key` is application:<id>, form:<id> or name:<name> (lib/interview/candidate-key.ts).
 */
export default async function CandidateEvaluationsPage({ params }: PageProps<'/admin/interviews/candidate/[key]'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const key = decodeURIComponent((await params).key);
  const ref = parseCandidateKey(key);
  if (!ref) notFound();
  const evaluations = await store().interviewEvaluations.forCandidate(ref);
  if (!evaluations.length) notFound();

  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('interviews.candidate');
  const tf = await getTranslations('interviews.form');
  const tl = await getTranslations('interviews.list');
  const latest = [...evaluations].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]!;
  const who = latest.candidate;
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
        <Table className="text-left">
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
                  <div>{e.evaluator.name || e.evaluator.email}</div>
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
                    href={`/admin/interviews/${e.id}`}
                    className="text-sm font-semibold text-blue-700 hover:underline"
                  >
                    {t('open')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
