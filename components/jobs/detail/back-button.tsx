'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cx } from '@/lib/cx';
import { useRouter } from '@/lib/i18n/navigation';

/** "Back": to the previous page when there is one (keeps the visitor's filters), else to the job list. */
export function BackButton() {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/jobs'))}
      className={cx(
        'inline-flex items-center gap-2 rounded-xl px-3 py-2',
        'text-sm font-semibold text-slate-700',
        'transition hover:bg-slate-50 active:bg-slate-100',
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-orange-200/60',
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
      {t('back')}
    </button>
  );
}
