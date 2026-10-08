'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tableHref, type TablePaging } from './table-href';

/** How many rows a page shows (a size typed into the url is kept and shown too). Changing it goes to page 1. */
export function PageSizeSelect({
  paging,
  pageSize,
  sizes: offered,
  scroll = true,
}: {
  paging: TablePaging;
  pageSize: number;
  sizes: readonly number[];
  /** false: stay where the table is (a table lower on the page). */
  scroll?: boolean;
}) {
  const t = useTranslations('common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sizes = offered.includes(pageSize) ? [...offered] : [...offered, pageSize].sort((a, b) => a - b);

  return (
    <Select
      value={String(pageSize)}
      disabled={pending}
      onValueChange={(value) => startTransition(() => router.push(tableHref(paging, 1, Number(value)), { scroll }))}
    >
      <SelectTrigger
        aria-label={t('pageSize')}
        className="h-9! rounded-xl border-gray-200 bg-white px-3 text-sm text-gray-900"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {sizes.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {t('perPage', { count: size })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
