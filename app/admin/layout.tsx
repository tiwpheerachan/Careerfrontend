import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/shell/admin-header';
import { AppSidebar } from '@/components/admin/shell/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { adminActor } from '@/lib/auth/admin';
import { UnavailableError } from '@/lib/errors';
import '../globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * The admin's own document (a second root layout beside app/[locale]): no
 * public navbar or footer, its own language (cookie) and messages.
 *
 * Behind the admin gate (lib/auth/admin.ts): open in development; in
 * production, until sign-in exists, every admin page shows "not available".
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('unavailable');

  let actor: { email: string } | undefined;
  try {
    actor = await adminActor();
  } catch (error) {
    if (!(error instanceof UnavailableError)) throw error;
  }

  return (
    <html lang={locale}>
      <body className="bg-gray-50 text-gray-900">
        <NextIntlClientProvider>
          {actor ? (
            <TooltipProvider>
              <SidebarProvider>
                <AppSidebar actorEmail={actor.email} />
                <SidebarInset className="min-h-screen min-w-0 bg-gray-50">
                  <AdminHeader />
                  <main className="w-full p-4 sm:p-6 lg:p-8 2xl:p-10">{children}</main>
                </SidebarInset>
              </SidebarProvider>
              <Toaster position="bottom-right" richColors theme="light" />
            </TooltipProvider>
          ) : (
            <main className="grid min-h-screen place-items-center p-6">
              <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xs">
                <h1 className="text-xl font-black tracking-tight text-gray-900">{t('title')}</h1>
                <p className="mt-2 text-sm text-gray-500">{t('body')}</p>
              </div>
            </main>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
