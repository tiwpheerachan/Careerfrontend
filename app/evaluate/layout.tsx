import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { UnsavedChangesDialog } from '@/components/admin/shell/unsaved-guard';
import { Toaster } from '@/components/ui/sonner';
import '../globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invitee');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * The page an invitation link opens (app/evaluate/[token]): a root layout of
 * its own — the admin's look and languages (proxy.ts marks /evaluate as the
 * admin's), but none of the admin around it. The person here may have no
 * role at all; the link is all they get.
 */
export default async function EvaluateLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="bg-gray-50 text-gray-900">
        <NextIntlClientProvider>
          {children}
          {/* The form guards unsaved scores (lib/admin/unsaved.ts); its question needs a dialog here too. */}
          <UnsavedChangesDialog />
          {/* Top: on a phone the form's send button sits at the bottom, where a toast would cover it. */}
          <Toaster position="top-center" richColors theme="light" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
