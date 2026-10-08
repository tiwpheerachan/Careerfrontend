import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { STAGE_TONE, ToneBadge } from '@/components/admin/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/admin/format';
import type { AdminLocale } from '@/lib/i18n/admin';
import type { ApplicationListItem } from '@/lib/repositories/applications';
import { cn } from '@/lib/utils';
import { defaultDir, listHref, listSearch, type ListQuery, type SortKey } from './list-query';

/** The applicants table — the old one, with sortable headers. */
export async function ApplicationsTable({
  rows,
  query,
  locale,
  jobTitles,
}: {
  rows: ApplicationListItem[];
  query: ListQuery;
  locale: AdminLocale;
  /** Job titles in the admin's language, by job id (falls back to the row's own). */
  jobTitles: Map<string, string>;
}) {
  const t = await getTranslations('applications.list');
  const tStage = await getTranslations('stage');
  const from = listSearch(query);
  const detailHref = (id: string) => `/admin/applications/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;

  const sortable = (key: SortKey, label: string) => (
    <SortHeader query={query} sortKey={key} label={label} ariaLabel={t('sortBy', { column: label })} />
  );

  return (
    <Table className="text-left">
      <TableHeader className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase [&_tr]:border-0">
        <TableRow className="hover:bg-transparent">
          <Th ariaSort={ariaSort(query, 'name')}>{sortable('name', t('columns.name'))}</Th>
          <Th ariaSort={ariaSort(query, 'job')}>{sortable('job', t('columns.job'))}</Th>
          <Th>{t('columns.contact')}</Th>
          <Th ariaSort={ariaSort(query, 'stage')}>{sortable('stage', t('columns.stage'))}</Th>
          <Th ariaSort={ariaSort(query, 'createdAt')}>{sortable('createdAt', t('columns.applied'))}</Th>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
            <TableCell className="px-4 py-3">
              <Link prefetch={false} href={detailHref(r.id)} className="font-semibold text-blue-700 hover:underline">
                {`${r.firstName} ${r.lastName}`}
              </Link>
            </TableCell>
            <TableCell className="min-w-56 px-4 py-3 whitespace-normal text-gray-700">
              <div className="font-medium text-gray-800">{jobTitles.get(r.job.id) ?? r.job.title ?? r.job.code}</div>
              <div className="text-xs text-gray-400">
                {r.job.code}
                {[r.job.department, r.job.level].filter(Boolean).length
                  ? ' · ' + [r.job.department, r.job.level].filter(Boolean).join(' • ')
                  : ''}
              </div>
            </TableCell>
            <TableCell className="px-4 py-3 text-gray-600">
              <div>{r.email}</div>
              <div className="text-xs text-gray-400">{r.phone}</div>
            </TableCell>
            <TableCell className="px-4 py-3">
              <ToneBadge tone={STAGE_TONE[r.stage]}>{tStage(r.stage)}</ToneBadge>
            </TableCell>
            <TableCell className="px-4 py-3 text-gray-500">{formatDateTime(r.createdAt, locale)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Th({ children, ariaSort }: { children: ReactNode; ariaSort?: 'ascending' | 'descending' | 'none' }) {
  return (
    <TableHead aria-sort={ariaSort} className="h-auto px-4 py-3 font-semibold text-gray-500">
      {children}
    </TableHead>
  );
}

function ariaSort(query: ListQuery, key: SortKey): 'ascending' | 'descending' | 'none' {
  const active = (query.sort ?? 'createdAt') === key;
  if (!active) return 'none';
  return (query.dir ?? defaultDir(query.sort)) === 'asc' ? 'ascending' : 'descending';
}

/** A header that sorts by its column; clicking the active one flips the direction. */
function SortHeader({
  query,
  sortKey,
  label,
  ariaLabel,
}: {
  query: ListQuery;
  sortKey: SortKey;
  label: string;
  ariaLabel: string;
}) {
  const current = query.sort ?? 'createdAt';
  const currentDir = query.dir ?? defaultDir(query.sort);
  const active = current === sortKey;
  const nextDir = active ? (currentDir === 'asc' ? 'desc' : 'asc') : defaultDir(sortKey);
  const Icon = !active ? ArrowUpDown : currentDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <Link
      prefetch={false}
      href={listHref(query, { sort: sortKey, dir: nextDir })}
      aria-label={ariaLabel}
      className={cn(
        'group inline-flex items-center gap-1 uppercase hover:text-gray-900',
        active ? 'text-gray-900' : 'text-gray-500',
      )}
    >
      {label}
      <Icon
        className={cn('h-3.5 w-3.5', active ? 'text-blue-600' : 'text-gray-300 group-hover:text-gray-400')}
        aria-hidden
      />
    </Link>
  );
}
