'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import { useJobsNav } from './jobs-nav';
import { pageItems, toQuery } from './jobs-query';

/**
 * The numbered pager shown above and below the list (old JobsPage
 * `Pagination`, same look). Pages are real links, so search engines can follow
 * them; a click is handled in place — the url changes, the server sends the
 * new page and the list scrolls into view.
 */
export function JobsPager({ totalPages, className }: { totalPages: number; className?: string }) {
  const t = useTranslations('jobs.pagination');
  const { query, goToPage } = useJobsNav();
  const page = Math.max(1, Math.min(totalPages, query.page));
  if (totalPages <= 1) return null;

  const href = (p: number) => ({ pathname: '/jobs' as const, query: toQuery({ ...query, page: p }) });
  const onClick = (p: number) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    goToPage(p);
  };

  return (
    <nav aria-label={t('label')} className={cx('flex items-center justify-center gap-2', className)}>
      <Arrow disabled={page <= 1} href={href(page - 1)} onClick={onClick(page - 1)} label={t('prev')}>
        <ChevronLeft className="h-4 w-4" />
      </Arrow>

      <div className="flex items-center gap-1">
        {pageItems(page, totalPages).map((it, idx) => {
          if (it === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 text-sm text-slate-500">
                …
              </span>
            );
          }
          const active = it === page;
          return (
            <Link
              key={it}
              href={href(it)}
              scroll={false}
              onClick={onClick(it)}
              className={cx(
                'inline-flex h-9 min-w-[38px] items-center justify-center rounded-xl border px-3 text-sm font-semibold transition',
                active
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
              aria-label={t('goTo', { page: it })}
              aria-current={active ? 'page' : undefined}
            >
              {it}
            </Link>
          );
        })}
      </div>

      <Arrow disabled={page >= totalPages} href={href(page + 1)} onClick={onClick(page + 1)} label={t('next')}>
        <ChevronRight className="h-4 w-4" />
      </Arrow>
    </nav>
  );
}

/** Previous / next: the old `btn btn-ghost` button; a link when there is somewhere to go. */
function Arrow({
  disabled,
  href,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  href: { pathname: '/jobs'; query: Record<string, string> };
  onClick: (e: MouseEvent) => void;
  label: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <button type="button" className="btn btn-ghost" disabled aria-label={label}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href} scroll={false} onClick={onClick} className="btn btn-ghost" aria-label={label}>
      {children}
    </Link>
  );
}
