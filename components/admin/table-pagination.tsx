import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { PageSizeSelect } from './page-size-select';
import { tableHref, type TablePaging } from './table-href';

/** 1 … 4 5 6 … 12 — the first, the last, and the pages around the current one. */
function pageNumbers(page: number, pages: number): Array<number | 'gap'> {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  for (const p of sorted) {
    const last = out.at(-1);
    if (typeof last === 'number' && p - last === 2) out.push(last + 1);
    else if (typeof last === 'number' && p - last > 2) out.push('gap');
    out.push(p);
  }
  return out;
}

/**
 * A table's paging, the same under every admin list: page x of y and the rows
 * shown, page links with previous/next, and the page size.
 * The list's other state (its search, filters, sort) is `params`, kept on
 * every link; `page` and `pageSize` go in the url only when not the default.
 * Each list picks its own sizes (`sizes`, the first is the default).
 */
export async function TablePagination({
  path,
  params,
  page: requested,
  pageSize,
  total,
  sizes,
  names,
  scroll = true,
}: {
  path: string;
  params: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
  sizes: readonly number[];
  /** The url's names for this table's page and size, when the page has more than one table. */
  names?: TablePaging['names'];
  /** false: paging keeps the scroll position (a table lower on the page). */
  scroll?: boolean;
}) {
  const t = await getTranslations('common');
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, pages);
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  const paging: TablePaging = { path, params, defaultSize: sizes[0]!, names };
  const href = (p: number) => tableHref(paging, p, pageSize);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-500">
        {t('pageOf', { page, pages })}
        <span className="mx-1.5 text-gray-300">·</span>
        {t('range', { from, to, total })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {pages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PageLink scroll={scroll} href={page > 1 ? href(page - 1) : null} label={t('prev')} className="px-2.5">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('prev')}</span>
                </PageLink>
              </PaginationItem>
              {pageNumbers(page, pages).map((p, i) =>
                p === 'gap' ? (
                  <PaginationItem key={`gap-${i}`}>
                    <span aria-hidden className="grid h-9 w-7 place-items-center text-gray-400">
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                    <span className="sr-only">{t('morePages')}</span>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PageLink scroll={scroll} href={href(p)} active={p === page} className="w-9">
                      {p}
                    </PageLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PageLink
                  scroll={scroll}
                  href={page < pages ? href(page + 1) : null}
                  label={t('next')}
                  className="px-2.5"
                >
                  <span className="hidden sm:inline">{t('next')}</span>
                  <ChevronRight className="h-4 w-4" />
                </PageLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        <PageSizeSelect paging={paging} pageSize={pageSize} sizes={sizes} scroll={scroll} />
      </div>
    </div>
  );
}

/** The old btn-secondary as a page link (a next/link, so paging stays client-side). */
function PageLink({
  href,
  scroll,
  active = false,
  label,
  className,
  children,
}: {
  href: string | null;
  scroll: boolean;
  active?: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    buttonVariants({ variant: 'outline' }),
    'h-9 gap-1 rounded-xl border-gray-200 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50',
    active && 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-50',
    className,
  );
  if (!href) {
    return (
      <span aria-disabled className={cn(classes, 'pointer-events-none opacity-40')}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={scroll}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={active}
      className={classes}
    >
      {children}
    </Link>
  );
}
