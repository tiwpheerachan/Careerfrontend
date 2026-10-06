import { Compass, Smile, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BgSection } from './bg-section';
import { TypingTitle } from './typing-title';

type Card = { title: string; desc: string };

const ICONS = [Compass, Smile, Users];

/** "Who we are": the looping typed title and the value cards. */
export function WhoWeAre() {
  const t = useTranslations('about.whoWeAre');
  const cards = t.raw('cards') as Card[];

  return (
    <BgSection className="py-2">
      <section className="relative">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6 lg:px-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.22em] text-slate-900">
              <Users className="h-4 w-4 text-slate-900" />
              <span>{t('kicker')}</span>
            </div>

            <TypingTitle
              className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
              text={t('title')}
              pauseMs={900}
              deleteMs={420}
              typeSpeed={75}
              deleteSpeed={45}
            />

            <p className="mx-auto mt-3 max-w-[820px] text-sm leading-relaxed text-slate-700 sm:text-base sm:leading-6">
              {t('desc')}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {cards.map((card, idx) => {
              const Icon = ICONS[Math.min(idx, ICONS.length - 1)]!;
              return (
                <div key={card.title} className="rounded-2xl bg-white/95 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5">
                      <Icon className="h-6 w-6 text-emerald-700" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950">{card.title}</div>
                      <div className="mt-1 text-sm leading-relaxed text-slate-700">{card.desc}</div>
                      <div className="mt-4 h-px w-16 bg-slate-200" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </BgSection>
  );
}
