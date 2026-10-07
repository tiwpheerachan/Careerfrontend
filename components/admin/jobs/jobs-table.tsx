'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PUBLISH_TONE, ToneBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminFetch, AdminApiError } from '@/lib/admin/client';
import { formatDate } from '@/lib/admin/format';
import type { JobPublishState } from '@/lib/constants-types';
import type { AdminLocale } from '@/lib/i18n/admin';
import { cn } from '@/lib/utils';
import { DeleteJobDialog, type DeletableJob } from './delete-job-dialog';
import { PUBLISH_STATES } from './job-utils';
import { useAbilities } from '@/components/admin/shell/abilities';

export interface JobRow {
  id: string;
  code: string;
  title: string;
  department: string | null;
  level: string | null;
  quantity: number | null;
  applicantCount: number;
  publishState: JobPublishState;
  updatedAt: string;
}

type SortKey = 'title' | 'applicants' | 'updated';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };

/** The first click on a column: names A→Z, numbers and dates biggest/newest first. */
const FIRST_DIR: Record<SortKey, Sort['dir']> = { title: 'asc', applicants: 'desc', updated: 'desc' };

const STATE_DOT: Record<JobPublishState, string> = {
  DRAFT: 'bg-amber-500',
  PUBLISHED: 'bg-emerald-500',
  CLOSED: 'bg-gray-400',
};

/**
 * The jobs table — the old one's columns and look, on shadcn's Table, with
 * sortable columns and the row actions in a menu (edit, an explicit status,
 * delete behind a confirm dialog).
 */
export function JobsTable({ rows, total, filtered }: { rows: JobRow[]; total: number; filtered: boolean }) {
  const t = useTranslations('jobs.list');
  const common = useTranslations('common');
  const publishState = useTranslations('publishState');
  const tDelete = useTranslations('jobs.delete');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  // The server sends newest change first; that is the order until a header is clicked.
  const [sort, setSort] = useState<Sort | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DeletableJob | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const can = useAbilities();

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const collator = new Intl.Collator(locale === 'th' ? 'th' : 'en', { numeric: true, sensitivity: 'base' });
    const compare: Record<SortKey, (a: JobRow, b: JobRow) => number> = {
      title: (a, b) => collator.compare(a.title, b.title),
      applicants: (a, b) => a.applicantCount - b.applicantCount,
      updated: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    };
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => sign * compare[sort.key](a, b) || collator.compare(a.code, b.code));
  }, [rows, sort, locale]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST_DIR[key] }));

  const setState = async (row: JobRow, next: JobPublishState) => {
    if (next === row.publishState) return;
    setBusy(row.id);
    try {
      await adminFetch(`/jobs/${row.id}/publish-state`, { method: 'PATCH', json: { publishState: next } });
      toast.success(t('stateChanged', { title: row.title, state: publishState(next) }));
      router.refresh();
    } catch (error) {
      toast.error(t('stateFailed'), { description: error instanceof AdminApiError ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const head = 'h-auto px-4 py-3 text-xs font-semibold tracking-normal text-gray-500 uppercase';

  const sortable = (key: SortKey, label: string, className?: string) => {
    const active = sort?.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead
        className={cn(head, className)}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          title={t('sortBy', { column: label })}
          className={cn(
            '-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase hover:text-gray-900',
            active && 'text-gray-900',
          )}
        >
          {label}
          <Icon className={cn('h-3.5 w-3.5', active ? 'text-blue-600' : 'text-gray-300')} />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="card overflow-hidden">
      {sorted.length === 0 ? (
        <div className="p-8 text-sm text-gray-500">
          {total === 0 || !filtered ? (
            t('empty')
          ) : (
            <>
              {t('noMatch')} ·{' '}
              <Link href="/admin/jobs" className="font-semibold text-blue-700 hover:underline">
                {t('clearFilters')}
              </Link>
            </>
          )}
        </div>
      ) : (
        <Table className="text-left">
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              {sortable('title', t('columns.title'))}
              <TableHead className={head}>{t('columns.deptLevel')}</TableHead>
              <TableHead className={head}>{t('columns.openings')}</TableHead>
              {sortable('applicants', t('columns.applicants'))}
              <TableHead className={head}>{t('columns.status')}</TableHead>
              {sortable('updated', t('columns.updated'))}
              <TableHead className={cn(head, 'text-right')}>{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow
                key={row.id}
                className={cn('border-b border-gray-100 hover:bg-gray-50', busy === row.id && 'opacity-60')}
              >
                <TableCell className="min-w-56 px-4 py-3 whitespace-normal">
                  <Link href={`/admin/jobs/${row.id}`} className="font-semibold text-blue-700 hover:underline">
                    {row.title}
                  </Link>
                  <div className="font-mono text-xs text-gray-400">{row.code}</div>
                </TableCell>
                <TableCell className="min-w-40 px-4 py-3 whitespace-normal text-gray-700">
                  <div>{row.department || '—'}</div>
                  <div className="text-xs text-gray-400">{row.level || '—'}</div>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-600 tabular-nums">{row.quantity ?? '—'}</TableCell>
                <TableCell className="px-4 py-3">
                  {row.applicantCount ? (
                    <Link
                      href={`/admin/applications?jobId=${row.id}`}
                      title={t('viewApplicants')}
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      {t('applicantCount', { count: row.applicantCount })}
                    </Link>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <ToneBadge tone={PUBLISH_TONE[row.publishState]}>{publishState(row.publishState)}</ToneBadge>
                </TableCell>
                <TableCell className="px-4 py-3 text-gray-500">{formatDate(row.updatedAt, locale)}</TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy === row.id}
                        aria-label={t('actionsFor', { code: row.code })}
                        className="rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      >
                        {busy === row.id ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/jobs/${row.id}`}>
                          <Pencil /> {common('edit')}
                        </Link>
                      </DropdownMenuItem>
                      {can.jobs.edit && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-gray-400">{t('setState')}</DropdownMenuLabel>
                          <DropdownMenuRadioGroup
                            value={row.publishState}
                            onValueChange={(next) => setState(row, next as JobPublishState)}
                          >
                            {PUBLISH_STATES.map((s) => (
                              <DropdownMenuRadioItem key={s} value={s}>
                                <span className={cn('h-2 w-2 rounded-full', STATE_DOT[s])} />
                                {publishState(s)}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </>
                      )}
                      {can.jobs.manage && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => {
                              setDeleting({
                                id: row.id,
                                code: row.code,
                                title: row.title,
                                applicantCount: row.applicantCount,
                              });
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 /> {tDelete('action')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DeleteJobDialog
        job={deleting}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
