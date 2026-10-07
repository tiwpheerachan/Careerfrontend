import { ChevronLeft, ChevronRight, ClipboardCheck, Plus, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageHeader, ToneBadge, type Tone } from '@/components/admin/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/admin/format';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import type { AdminLocale } from '@/lib/i18n/admin';
import { candidateKey } from '@/lib/interview/candidate-key';
import { store } from '@/lib/store';

const PAGE_SIZE = 20;

const RESULT_TONE: Record<'PENDING' | 'PASS' | 'FAIL', Tone> = { PENDING: 'amber', PASS: 'emerald', FAIL: 'red' };

/** /admin/interviews — every interview evaluation, newest interview first. */
export default async function InterviewsPage({ searchParams }: PageProps<'/admin/interviews'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);
  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('interviews.list');
  const tf = await getTranslations('interviews.form');

  const { items, total } = await store().interviewEvaluations.list({ q: q || undefined, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/admin/interviews?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="[contain:inline-size]">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t('title')}
        subtitle={t('total', { count: total })}
        actions={
          abilitiesOf(actor).applications.edit && (
            <Link
              href="/admin/interviews/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> {t('new')}
            </Link>
          )
        }
      />

      <form className="mb-4 flex gap-2" action="/admin/interviews">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pr-3 pl-9 text-sm outline-hidden focus:border-blue-600"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t('search')}
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-400">
              <SearchX className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">{t('empty')}</p>
            <p className="text-sm text-gray-500">{q ? t('emptySearch') : t('emptyHint')}</p>
          </div>
        ) : (
          <>
            {/* Phones: one card per evaluation — the name opens the candidate, the card's link the evaluation. */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {items.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/interviews/candidate/${encodeURIComponent(candidateKey(e.candidate))}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {e.candidate.name}
                      </Link>
                      <div className="truncate text-xs text-gray-400">
                        {[e.candidate.position, e.candidate.department].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <ToneBadge tone={RESULT_TONE[e.result]}>{tf(`results.${e.result}`)}</ToneBadge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span className="min-w-0 truncate">
                      {tf(`rounds.${e.round}`)} · {e.evaluator.name || e.evaluator.email} ·{' '}
                      <span className="font-semibold text-gray-800">
                        {e.total}/{e.max}
                      </span>{' '}
                      · {formatDate(e.interviewDate, locale)}
                    </span>
                    <Link
                      href={`/admin/interviews/${e.id}`}
                      className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-blue-700 hover:underline"
                    >
                      {t('open')} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <Table className="hidden text-left md:table">
              <TableHeader className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase [&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3">{t('columns.candidate')}</TableHead>
                  <TableHead className="px-4 py-3">{t('columns.round')}</TableHead>
                  <TableHead className="px-4 py-3">{t('columns.evaluator')}</TableHead>
                  <TableHead className="px-4 py-3">{t('columns.score')}</TableHead>
                  <TableHead className="px-4 py-3">{t('columns.result')}</TableHead>
                  <TableHead className="px-4 py-3">{t('columns.date')}</TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    <span className="sr-only">{t('columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <TableCell className="min-w-48 px-4 py-3 whitespace-normal">
                      <Link
                        href={`/admin/interviews/candidate/${encodeURIComponent(candidateKey(e.candidate))}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {e.candidate.name}
                      </Link>
                      <div className="text-xs text-gray-400">
                        {[e.candidate.position, e.candidate.department].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="text-gray-700">{tf(`rounds.${e.round}`)}</span>
                    </TableCell>
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
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {formatDate(e.interviewDate, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/interviews/${e.id}`}
                        className="text-sm font-semibold whitespace-nowrap text-blue-700 hover:underline"
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

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>{t('pageOf', { page, pages })}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={href(page - 1)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" /> {t('prev')}
              </Link>
            )}
            {page < pages && (
              <Link
                href={href(page + 1)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gray-100"
              >
                {t('next')} <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
