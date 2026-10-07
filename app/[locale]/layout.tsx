import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Footer } from '@/components/site/footer';
import { Navbar } from '@/components/site/navbar';
import { routing } from '@/lib/i18n/routing';
import '../globals.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

// Pages read jobs and the admin's text edits from the database on each request.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = { themeColor: '#1d4ed8' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    // Absolute urls for OpenGraph images and canonical links.
    metadataBase: new URL(process.env.SITE_URL?.trim() || `http://localhost:${process.env.PORT || 3000}`),
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
  };
}

/**
 * The public site's document: Navbar, the page, Footer — the old Layout.tsx.
 * `lang` follows the url (the old site's was always "en").
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="relative isolate flex-1 overflow-x-hidden pt-0 pb-10 sm:pb-12 lg:pb-16">
              <div className="min-h-full">{children}</div>
            </main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
