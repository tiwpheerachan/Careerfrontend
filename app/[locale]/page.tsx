import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FindYourFit, topDepartments } from '@/components/home/find-your-fit';
import { Gallery } from '@/components/home/gallery';
import { Hero } from '@/components/home/hero';
import { Offices } from '@/components/home/offices';
import type { HomeJob } from '@/components/home/offices-data';
import type { Locale } from '@/lib/i18n/routing';
import { store } from '@/lib/store';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home.meta' });
  const title = t('title');
  const description = t('description');
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: 'website', locale },
  };
}

/** The home page (old frontend/src/pages/HomePage.tsx): hero, offices globe, departments, partners. */
export default async function HomePage({ params }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);

  const jobs = await store().jobs.listPublic({ locale });
  const homeJobs: HomeJob[] = jobs.map(({ code, title, countryCode, department, level }) => ({
    code,
    title,
    countryCode,
    department,
    level,
  }));

  return (
    <>
      <Hero openings={jobs.length} />
      <Offices jobs={homeJobs} />
      <FindYourFit departments={topDepartments(jobs.map((j) => j.department))} />
      <Gallery />
    </>
  );
}
