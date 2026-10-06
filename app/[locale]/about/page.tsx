import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AboutAwards } from '@/components/about/about-awards';
import { AboutHero } from '@/components/about/about-hero';
import { AboutJourney } from '@/components/about/about-journey';
import { AboutStory } from '@/components/about/about-story';
import { BgSection } from '@/components/about/bg-section';
import { MissionVision } from '@/components/about/mission-vision';
import { WhoWeAre } from '@/components/about/who-we-are';

type Props = { params: Promise<{ locale: string }> };

const OG_IMAGE = '/videos/about/x50-ultra-banner.webp';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const about = await getTranslations({ locale, namespace: 'about' });
  const meta = await getTranslations({ locale, namespace: 'meta' });

  const title = nav('about');
  const description = about('seo.description');
  return {
    title,
    description,
    openGraph: { type: 'website', title: `${title} · ${meta('title')}`, description, images: [OG_IMAGE] },
  };
}

/** About SHD — ported from frontend/src/pages/AboutPage.tsx, one component per section. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <BgSection bgSrc="/videos/about/x50-ultra-banner.webp" className="pb-4">
        <AboutHero />
      </BgSection>

      <AboutStory />
      <MissionVision />
      <WhoWeAre />
      <AboutJourney />
      <AboutAwards />

      <div className="h-10" />
    </div>
  );
}
