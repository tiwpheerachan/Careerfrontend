'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listHref, PAGE_SIZES, type ListQuery } from './list-query';

/** 20 / 50 / 100 per page (a size typed into the url is kept and shown too). */
export function PageSizeSelect({ query }: { query: ListQuery }) {
  const t = useTranslations('applications.list');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sizes = (PAGE_SIZES as readonly number[]).includes(query.pageSize)
    ? [...PAGE_SIZES]
    : [...PAGE_SIZES, query.pageSize].sort((a, b) => a - b);

  return (
    <Select
      value={String(query.pageSize)}
      disabled={pending}
      onValueChange={(value) => startTransition(() => router.push(listHref(query, { pageSize: Number(value) })))}
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
