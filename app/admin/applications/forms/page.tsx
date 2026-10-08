import { ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, FileDown, SearchX } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ApplicationViewTabs } from '@/components/admin/applications/view-tabs';
import { DeleteApplicationForm } from '@/components/admin/applications/delete-form';
import { FormsSearch } from '@/components/admin/applications/forms-search';
import { PageHeader } from '@/components/admin/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/admin/format';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';
import type { AdminLocale } from '@/lib/i18n/admin';
import { store } from '@/lib/store';

const PAGE_SIZE = 20;

const LETTERHEAD_TONE = {
  SHD: 'bg-amber-50 text-amber-800 ring-amber-200',
  RABBIT: 'bg-orange-50 text-orange-700 ring-orange-200',
  TOPONE: 'bg-slate-100 text-slate-700 ring-slate-200',
  PLAIN: 'bg-gray-50 text-gray-500 ring-gray-200',
} as const;

/**
 * /admin/applications/forms — the paper application forms filled in on the
 * public site, newest first. Each prints onto its company's blank form (PDF);
 * the sensitive fields only for manage.
 */
export default async function ApplicationFormsPage({ searchParams }: PageProps<'/admin/applications/forms'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);
  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('applications.forms');
  const manage = abilitiesOf(actor).applications.manage;

  const { items, total } = await store().applicationForms.list({ q: q || undefined, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) =>
    `/admin/applications/forms?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="[contain:inline-size]">
      <PageHeader
        icon={<ClipboardList className="h-5 w-5" />}
        title={t('title')}
        subtitle={t('total', { count: total })}
      />
      <ApplicationViewTabs current="forms" />

      <FormsSearch q={q} placeholder={t('searchPlaceholder')} />

      {!manage && <p className="mb-3 text-xs text-gray-500">{t('sensitiveHidden')}</p>}

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
          <Table className="text-left">
            <TableHeader className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase [&_tr]:border-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4 py-3">{t('columns.name')}</TableHead>
                <TableHead className="px-4 py-3">{t('columns.position')}</TableHead>
                <TableHead className="px-4 py-3">{t('columns.company')}</TableHead>
                <TableHead className="px-4 py-3">{t('columns.contact')}</TableHead>
                <TableHead className="px-4 py-3">{t('columns.sent')}</TableHead>
                <TableHead className="px-4 py-3 text-right">
                  <span className="sr-only">{t('columns.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((form) => (
                <TableRow key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <TableCell className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{form.nameTh}</div>
                    {form.nameEn && <div className="text-xs text-gray-400">{form.nameEn}</div>}
                  </TableCell>
                  <TableCell className="min-w-48 px-4 py-3 whitespace-normal text-gray-700">
                    <div className="font-medium text-gray-800">{form.position}</div>
                    <div className="text-xs text-gray-400">{form.jobCode ?? t('otherPosition')}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LETTERHEAD_TONE[form.letterhead]}`}
                    >
                      {t(`letterheads.${form.letterhead}`)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-700">
                    <div>{form.mobile}</div>
                    <div className="text-xs text-gray-400">{form.email}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {formatDateTime(form.createdAt, locale)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/api/v1/admin/application-forms/${form.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                      >
                        <FileDown className="h-4 w-4 text-blue-600" />
                        {t('pdf')}
                      </a>
                      {abilitiesOf(actor).applications.edit && (
                        <Link
                          prefetch={false}
                          href={`/admin/interviews/candidate/${encodeURIComponent(`form:${form.id}`)}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50"
                        >
                          <ClipboardCheck className="h-4 w-4 text-blue-600" />
                          {t('evaluate')}
                        </Link>
                      )}
                      <DeleteApplicationForm id={form.id} name={form.nameTh} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                <ChevronLeft className="h-4 w-4" />
                {t('prev')}
              </Link>
            )}
            {page < pages && (
              <Link
                href={href(page + 1)}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-gray-100"
              >
                {t('next')}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
