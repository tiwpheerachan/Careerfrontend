import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/shell/admin-header';
import { AppSidebar } from '@/components/admin/shell/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AbilitiesProvider } from '@/components/admin/shell/abilities';
import { NoAccess } from '@/components/auth/no-access';
import { abilitiesOf, adminActor, ssoConfigured, type AdminActor } from '@/lib/auth/admin';
import { currentUser } from '@/lib/auth/current';
import { ForbiddenError, UnauthorizedError, UnavailableError } from '@/lib/errors';
import { ADMIN_PATH_HEADER } from '@/lib/i18n/admin';
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
 * Behind the admin gate (lib/auth/admin.ts): signed in with SHD SSO, and
 * allowed something by the central permission system. Signed in but allowed
 * nothing — or the central system not answering — shows that, with the
 * account, instead of the admin. Without SSO configured: open in development,
 * "not available" in production (proxy.ts answers 503 before this runs).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('unavailable');

  let actor: AdminActor | undefined;
  let blocked: 'access' | 'unavailable' | 'closed' | undefined;
  try {
    actor = await adminActor();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // proxy.ts sends anyone without a valid cookie to sign in first; this is
      // the cookie expiring between the two.
      const path = (await headers()).get(ADMIN_PATH_HEADER) ?? '/admin';
      redirect(`/sso/login?next=${encodeURIComponent(path)}`);
    }
    if (error instanceof ForbiddenError) blocked = 'access';
    else if (error instanceof UnavailableError) blocked = ssoConfigured() ? 'unavailable' : 'closed';
    else throw error;
  }
  const email = blocked && blocked !== 'closed' ? ((await currentUser())?.email ?? '') : '';

  return (
    <html lang={locale}>
      <body className="bg-gray-50 text-gray-900">
        <NextIntlClientProvider>
          {actor ? (
            <TooltipProvider>
              <AbilitiesProvider value={abilitiesOf(actor)}>
                <SidebarProvider>
                  <AppSidebar actor={{ name: actor.name, email: actor.email, dev: actor.sub === 'dev' }} />
                  <SidebarInset className="min-h-screen min-w-0 bg-gray-50">
                    <AdminHeader />
                    <main className="w-full p-4 sm:p-6 lg:p-8 2xl:p-10">{children}</main>
                  </SidebarInset>
                </SidebarProvider>
              </AbilitiesProvider>
              {/* Phones: above the bottom bars (the interview form's score and save button). */}
              <Toaster position="bottom-right" mobileOffset={{ bottom: 96 }} richColors theme="light" />
            </TooltipProvider>
          ) : blocked === 'access' || blocked === 'unavailable' ? (
            <NoAccess email={email} reason={blocked} />
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
