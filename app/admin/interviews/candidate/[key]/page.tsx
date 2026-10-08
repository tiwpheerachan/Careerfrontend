import { ArrowLeft, ChevronRight, FileDown, Mail, UserRound } from 'lucide-react';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ResultScore, ResultVerdict, ScoreFormula } from '@/components/admin/interviews/candidate-result';
import { InvitationsPanel } from '@/components/admin/interviews/invitations-panel';
import { TablePagination } from '@/components/admin/table-pagination';
import { PageHeader, RESULT_TONE, ToneBadge } from '@/components/admin/ui';
import { formatDate } from '@/lib/admin/format';
import { requestOrigin } from '@/lib/api/origin';
import { requireAdminPage } from '@/lib/auth/admin';
import { EVALUATOR_ROLES } from '@/lib/constants';
import type { AdminLocale } from '@/lib/i18n/admin';
import { parseCandidateKey } from '@/lib/interview/candidate-key';
import { candidateResult, formatAverage, summarize } from '@/lib/interview/summary';
import { store } from '@/lib/store';

const PDF_LANGUAGES = ['th', 'en', 'zh'] as const;
/** Rows per page on offer for both tables here; the first is the default. */
const PAGE_SIZES = [10, 25, 50, 100] as const;
/** The url's names for each table's paging: the two page apart. */
const INVITATIONS = { page: 'invPage', size: 'invPageSize' };
const EVALUATIONS = { page: 'evPage', size: 'evPageSize' };

type Raw = Record<string, string | string[] | undefined>;

/**
 * One table's page and size from the url (any size 1–100 works; the picker
 * offers PAGE_SIZES). A page past the last (a stale link, or rows deleted
 * since) shows the last.
 */
function pagingOf(raw: Raw, names: { page: string; size: string }, total: number) {
  const get = (name: string) => Number.parseInt(typeof raw[name] === 'string' ? raw[name] : '', 10);
  const page = get(names.page);
  const size = get(names.size);
  const pageSize = size >= 1 && size <= 100 ? size : PAGE_SIZES[0];
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return { page: page >= 1 ? Math.min(page, pages) : 1, pageSize };
}

/** A table's paging, as url params (left out when the default) — what the other table's links keep. */
function paramsOf(paging: { page: number; pageSize: number }, names: { page: string; size: string }) {
  return {
    ...(paging.page > 1 ? { [names.page]: String(paging.page) } : {}),
    ...(paging.pageSize !== PAGE_SIZES[0] ? { [names.size]: String(paging.pageSize) } : {}),
  };
}

/** The rows of one page. */
const pageOf = <T,>(rows: T[], { page, pageSize }: { page: number; pageSize: number }) =>
  rows.slice((page - 1) * pageSize, page * pageSize);

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
export default async function CandidateEvaluationsPage({ params, searchParams }: Props) {
  await requireAdminPage({ resource: 'applications', level: 'view' });
  const { key, ref, evaluations, invitations, who } = await load((await params).key);
  const raw = (await searchParams) as Raw;
  const invPaging = pagingOf(raw, INVITATIONS, invitations.length);
  const evPaging = pagingOf(raw, EVALUATIONS, evaluations.length);
  const overall = candidateResult(evaluations);
  const shownEvaluations = pageOf(evaluations, evPaging);
  const path = `/admin/interviews/candidate/${encodeURIComponent(key)}`;
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
      />

      {/* The result over everything, as the list's row has it; then per round and side, where it comes from.
          Each evaluator's own is in the list below. */}
      {overall && (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-bold text-gray-900">{t('summaryTitle')}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{t('overallHint')}</p>
          <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-3 rounded-xl bg-gray-50 p-4">
            <ResultScore result={overall} large />
            <ResultVerdict result={overall} />
            <div className="w-full border-t border-gray-200 pt-3">
              <ScoreFormula result={overall} />
            </div>
          </div>

          <h3 className="mt-5 text-xs font-bold text-gray-700">{t('breakdownTitle')}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{t('summaryHint')}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summarize(evaluations).map((s) => (
              <div key={`${s.role}-${s.round}`} className="rounded-xl border border-gray-200 p-3">
                <div className="text-xs font-semibold text-gray-500">
                  {tf(`rounds.${s.round}`)} · {tf(`roles.${s.role}`)}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black tracking-tight text-gray-900">
                    {formatAverage(s.generalAverage)}
                  </span>
                  <span className="text-sm font-semibold text-gray-400">/ 50</span>
                  <span className="ml-1 text-xs text-gray-500">{t('averageOf', { count: s.count })}</span>
                </div>
                {s.seniorAverage !== null && (
                  <div className="text-xs text-gray-600">
                    {t('seniorAverage', { score: formatAverage(s.seniorAverage) })}
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-600">{t('meetsCount', { meets: s.meets, count: s.count })}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(['PASS', 'PENDING', 'FAIL'] as const)
                    .filter((r) => s.results[r] > 0)
                    .map((r) => (
                      <ToneBadge key={r} tone={RESULT_TONE[r]}>
                        {tf(`results.${r}`)} · {s.results[r]}
                      </ToneBadge>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <InvitationsPanel
        candidate={{
          applicationId: ref.kind === 'application' ? ref.id : null,
          applicationFormId: ref.kind === 'form' ? ref.id : null,
          name: who.name,
          position: who.position,
          department: who.department,
        }}
        invitations={pageOf(invitations, invPaging).map(({ token, ...inv }) => ({
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
        footer={
          invitations.length > 0 && (
            <TablePagination
              path={path}
              params={paramsOf(evPaging, EVALUATIONS)}
              page={invPaging.page}
              pageSize={invPaging.pageSize}
              total={invitations.length}
              sizes={PAGE_SIZES}
              names={INVITATIONS}
              scroll={false}
            />
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

      {/* Each evaluator's own round, as a card like the invitations above; each opens its full form. */}
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900">{t('listTitle')}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{t('listHint')}</p>
        {evaluations.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">{t('empty')}</p>
        ) : (
          <>
            {/* Below xl (the sidebar leaves the table too little room): one row per evaluation, the whole row opens it. */}
            <ul className="mt-4 divide-y divide-gray-100 xl:hidden">
              {shownEvaluations.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/interviews/${e.id}?from=candidate`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-gray-50"
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

            <table className="mt-4 hidden w-full text-left text-sm xl:table">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500">
                  <th className="py-2 pr-3 font-semibold">{tl('columns.round')}</th>
                  <th className="py-2 pr-3 font-semibold">{tl('columns.evaluator')}</th>
                  <th className="py-2 pr-3 font-semibold">{tl('columns.score')}</th>
                  <th className="py-2 pr-3 font-semibold">{tl('columns.result')}</th>
                  <th className="py-2 pr-3 font-semibold">{tl('columns.date')}</th>
                  <th className="py-2 font-semibold">
                    <span className="sr-only">{tl('columns.actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shownEvaluations.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 align-top last:border-0">
                    <td className="py-3 pr-3 font-semibold whitespace-nowrap text-gray-900">
                      {tf(`rounds.${e.round}`)}
                    </td>
                    <td className="py-3 pr-3 text-gray-700">
                      <div className="flex items-center gap-1.5">
                        {e.evaluator.name || e.evaluator.email}
                        {e.viaInvitation && (
                          <Mail className="h-3.5 w-3.5 text-violet-600" aria-label={tf('viaInvitation')} />
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{tf(`roles.${e.evaluatorRole}`)}</div>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">
                        {e.total}/{e.max}
                      </span>
                      <span className={e.meetsPassMark ? 'ml-2 text-xs text-emerald-700' : 'ml-2 text-xs text-red-600'}>
                        {e.meetsPassMark ? tf('meets') : tf('notMeets')}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <ToneBadge tone={RESULT_TONE[e.result]}>{tf(`results.${e.result}`)}</ToneBadge>
                      {e.result === 'FAIL' && e.failReason && (
                        <div className="mt-1 text-xs text-gray-500">{e.failReason}</div>
                      )}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-gray-500">{formatDate(e.interviewDate, locale)}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/interviews/${e.id}?from=candidate`}
                        className="text-sm font-semibold whitespace-nowrap text-blue-700 hover:underline"
                      >
                        {t('open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <TablePagination
              path={path}
              params={paramsOf(invPaging, INVITATIONS)}
              page={evPaging.page}
              pageSize={evPaging.pageSize}
              total={evaluations.length}
              sizes={PAGE_SIZES}
              names={EVALUATIONS}
              scroll={false}
            />
          </>
        )}
      </section>
    </div>
  );
}
