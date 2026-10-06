'use client';

import { Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Locale } from '@/lib/i18n/routing';
import { usePathname, useRouter } from '@/lib/i18n/navigation';

const LANGS: Array<{ code: Locale; label: string }> = [
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

/**
 * The language picker: the old site's white box with a globe, now a shadcn
 * Select. Changing it swaps the /th /en /zh prefix and keeps the rest of the
 * url (filters included).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={className}>
      <Select
        value={locale}
        onValueChange={(next) =>
          startTransition(() => {
            const query = search.toString();
            router.replace(`${pathname}${query ? `?${query}` : ''}`, { locale: next as Locale, scroll: false });
          })
        }
        disabled={pending}
      >
        <SelectTrigger
          aria-label={t('language')}
          className="h-auto gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-soft [&>svg:last-child]:text-slate-800"
        >
          <Globe className="h-4 w-4 text-slate-600" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end" className="rounded-xl">
          {LANGS.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
