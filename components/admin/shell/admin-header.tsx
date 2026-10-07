'use client';

import { Languages, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSidebar } from '@/components/ui/sidebar';
import { ADMIN_LOCALE_COOKIE, type AdminLocale } from '@/lib/i18n/admin';
import { Brand } from '../ui';

/**
 * The sticky white bar above every admin page: the menu button and compact
 * mark on phones, the "back office" note and the language picker on the right.
 */
export function AdminHeader() {
  const t = useTranslations('nav');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const [pending, startTransition] = useTransition();

  const setLocale = (next: string) => {
    document.cookie = `${ADMIN_LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={toggleSidebar}
        className="grid h-9 w-9 place-items-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
        aria-label={t('openMenu')}
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="md:hidden">
        <Brand compact />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-gray-400 md:block">{t('headerNote')}</span>
        <Select value={locale} onValueChange={setLocale} disabled={pending}>
          <SelectTrigger
            aria-label={t('language')}
            size="sm"
            className="gap-1.5 rounded-lg border-gray-200 bg-white text-gray-700"
          >
            <Languages className="h-4 w-4 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectItem value="th">ไทย</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
