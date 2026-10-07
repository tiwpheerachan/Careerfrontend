import { ClipboardList, Users } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

/**
 * The two lists under "Applicants": applications for a job (with files and a
 * hiring stage) and the paper application forms filled in on the site.
 */
export async function ApplicationViewTabs({ current }: { current: 'applications' | 'forms' }) {
  const t = await getTranslations('applications.tabs');
  const tabs = [
    { key: 'applications', href: '/admin/applications', icon: Users },
    { key: 'forms', href: '/admin/applications/forms', icon: ClipboardList },
  ] as const;
  return (
    <nav className="mb-5 flex gap-1 border-b border-gray-200" aria-label={t('label')}>
      {tabs.map(({ key, href, icon: Icon }) => {
        const active = key === current;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition',
              active
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800',
            )}
          >
            <Icon className="h-4 w-4" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
