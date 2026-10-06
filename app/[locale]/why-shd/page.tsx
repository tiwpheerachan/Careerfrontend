import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaSection } from '@/components/why/cta-section';
import { LifeSection } from '@/components/why/life-section';
import { PillarsSection } from '@/components/why/pillars-section';
import { StoriesSection } from '@/components/why/stories-section';
import { WhyHero } from '@/components/why/why-hero';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'why' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const meta = await getTranslations({ locale, namespace: 'meta' });
  const title = nav('why');
  const description = t('seo.description');
  return {
    title,
    description,
    openGraph: { title: `${title} · ${meta('title')}`, description, type: 'website', locale },
  };
}

/** Why SHD — ported from frontend/src/pages/WhyPage.tsx. */
export default async function WhyPage({ params }: Props) {
  setRequestLocale((await params).locale);

  return (
    <>
      <WhyHero />
      <PillarsSection />
      <StoriesSection />
      <LifeSection />
      <CtaSection />
    </>
  );
}
