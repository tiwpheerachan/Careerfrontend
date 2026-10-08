import { ChevronRight, ClipboardCheck, Plus, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { tableHref } from '@/components/admin/table-href';
import { ResultScore, ResultVerdict } from '@/components/admin/interviews/candidate-result';
import { TablePagination } from '@/components/admin/table-pagination';
import { PageHeader } from '@/components/admin/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/admin/format';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import { EVALUATOR_ROLES } from '@/lib/constants';
import type { AdminLocale } from '@/lib/i18n/admin';
import { candidateResult } from '@/lib/interview/summary';
import { store } from '@/lib/store';

/** Rows per page on offer; the first is the default. */
const PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * /admin/interviews — one row per candidate, newest interview first: their
 * evaluators, the average score and the result over both rounds and both sides
 * (lib/interview/summary.ts candidateResult(): the one chosen most, a tie is pending),
 * with each round's own result under it.
 */
export default async function InterviewsPage({ searchParams }: PageProps<'/admin/interviews'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);
  // Any size from 1 to 100 works from the url; the picker offers PAGE_SIZES.
  const askedSize = Number.parseInt(typeof params.pageSize === 'string' ? params.pageSize : '', 10);
  const pageSize = askedSize >= 1 && askedSize <= 100 ? askedSize : PAGE_SIZES[0];
  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('interviews.list');
  const tf = await getTranslations('interviews.form');

  const { items, total } = await store().interviewEvaluations.byCandidate({ q: q || undefined, page, pageSize });

  // Past the last page (a stale link, or rows deleted since): go to the last one.
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (page > pages) {
    redirect(
      tableHref({ path: '/admin/interviews', params: q ? { q } : {}, defaultSize: PAGE_SIZES[0] }, pages, pageSize),
    );
  }

  const rows = items.map(({ key, candidate, evaluations }) => {
    const byEmail = new Map(
      evaluations.map((e) => [e.evaluator.email.toLowerCase(), e.evaluator.name || e.evaluator.email]),
    );
    return {
      href: `/admin/interviews/candidate/${encodeURIComponent(key)}`,
      candidate,
      evaluators: [...byEmail.values()].join(', '),
      sides: EVALUATOR_ROLES.filter((role) => evaluations.some((e) => e.evaluatorRole === role)),
      result: candidateResult(evaluations)!, // a candidate here has at least one evaluation
      date: evaluations.map((e) => e.interviewDate).reduce((a, b) => (b > a ? b : a)),
    };
  });

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
        {/* A new search starts at page 1, with the page size kept. */}
        {pageSize !== PAGE_SIZES[0] && <input type="hidden" name="pageSize" value={pageSize} />}
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
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gray-100 text-gray-400">
              <SearchX className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-gray-700">{t('empty')}</p>
            <p className="text-sm text-gray-500">{q ? t('emptySearch') : t('emptyHint')}</p>
          </div>
        ) : (
          <>
            {/* Below xl (the sidebar leaves the table too little room): one card per candidate. */}
            <ul className="divide-y divide-gray-100 xl:hidden">
              {rows.map((row) => (
                <li key={row.href} className="px-4 py-3">
                  {/* The result under the name, the card wide: beside it, Thai wrapped a word per line. */}
                  <Link href={row.href} className="font-semibold text-blue-700 hover:underline">
                    {row.candidate.name}
                  </Link>
                  <div className="truncate text-xs text-gray-400">
                    {[row.candidate.position, row.candidate.department].filter(Boolean).join(' · ') || '—'}
                  </div>
                  <div className="mt-2 flex flex-wrap items-start gap-x-6 gap-y-2">
                    <ResultScore result={row.result} />
                    <ResultVerdict result={row.result} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span className="min-w-0 truncate">
                      {row.evaluators} · {formatDate(row.date, locale)}
                    </span>
                    <Link
                      href={row.href}
                      className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-blue-700 hover:underline"
                    >
                      {t('openResult')} <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
            <Table className="hidden text-left xl:table">
              <TableHeader className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase [&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 py-3">{t('columns.candidate')}</TableHead>
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
                {rows.map((row) => (
                  <TableRow key={row.href} className="border-b border-gray-100 align-top hover:bg-gray-50">
                    <TableCell className="min-w-48 px-4 py-3 whitespace-normal">
                      <Link href={row.href} className="font-semibold text-blue-700 hover:underline">
                        {row.candidate.name}
                      </Link>
                      <div className="text-xs text-gray-400">
                        {[row.candidate.position, row.candidate.department].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56 px-4 py-3 whitespace-normal text-gray-700">
                      <div>{row.evaluators}</div>
                      <div className="text-xs text-gray-400">
                        {row.sides.map((role) => tf(`roles.${role}`)).join(' · ')}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <ResultScore result={row.result} />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <ResultVerdict result={row.result} />
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {formatDate(row.date, locale)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Link
                        href={row.href}
                        className="text-sm font-semibold whitespace-nowrap text-blue-700 hover:underline"
                      >
                        {t('openResult')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {total > 0 && (
        <TablePagination
          path="/admin/interviews"
          params={q ? { q } : {}}
          page={page}
          pageSize={pageSize}
          total={total}
          sizes={PAGE_SIZES}
        />
      )}
    </div>
  );
}
