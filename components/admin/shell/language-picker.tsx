'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ADMIN_LOCALE_COOKIE, type AdminLocale } from '@/lib/i18n/admin';

/**
 * The admin's language, as the header's picker sets it (the admin_locale
 * cookie, then a refresh — what is typed stays). For pages outside the admin
 * shell that speak its languages: an invitation link (app/evaluate).
 */
export function LanguagePicker({ label }: { label: string }) {
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const setLocale = (next: string) => {
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <Select value={locale} onValueChange={setLocale} disabled={pending}>
      <SelectTrigger aria-label={label} size="sm" className="gap-1.5 rounded-lg border-gray-200 bg-white text-gray-700">
        <Languages className="h-4 w-4 text-gray-400" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value="th">ไทย</SelectItem>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
      </SelectContent>
    </Select>
  );
}
