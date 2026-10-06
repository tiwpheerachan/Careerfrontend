import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';

/** Placeholder until the home page is ported from frontend/src/pages/HomePage.tsx. */
export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(use(params).locale);
  const t = useTranslations('placeholder');

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-start justify-center gap-3 px-4">
      <h1 className="text-4xl font-black tracking-tight">{t('heading')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
    </main>
  );
}
