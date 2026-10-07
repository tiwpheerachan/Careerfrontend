import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import '../globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * The sign-in's own pages (/sso/error, /sso/signed-out): a third root layout
 * beside app/[locale] and app/admin. In the admin's language and messages
 * (proxy.ts marks /sso as the admin's), without the admin's sidebar.
 */
export default async function SsoLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="bg-gray-50 text-gray-900">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
