import { Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BgSection, SectionHeader } from './bg-section';
import { JourneyShowcase, type JourneyItem } from './journey-showcase';

/** "Our journey": centered header and the year stepper. */
export function AboutJourney() {
  const t = useTranslations('about.journey');

  return (
    <BgSection className="py-2">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6 lg:px-10">
        <SectionHeader
          kicker={t('header.kicker')}
          icon={<Rocket className="h-4 w-4" />}
          title={t('header.title')}
          desc={t('header.desc')}
          align="center"
        />

        <JourneyShowcase items={t.raw('items') as JourneyItem[]} />
      </div>
    </BgSection>
  );
}
