import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PartnersList } from '@/components/partners/partners-list';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'partners' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const title = nav('partners');
  const description = t('p1');
  return {
    title,
    description,
    openGraph: { title: `${title} · ${meta('title')}`, description, type: 'website', locale },
  };
}

/** Partners — ported from frontend/src/pages/PartnersPage.tsx. */
export default async function PartnersPage({ params }: Props) {
  setRequestLocale((await params).locale);
  return <PartnersList />;
}
