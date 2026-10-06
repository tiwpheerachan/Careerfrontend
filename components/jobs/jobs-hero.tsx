'use client';

import { Building2, Globe2, Layers, Search, X } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useEffectEvent, useState } from 'react';
import { countryName, flagOf } from '@/lib/countries';
import { cx } from '@/lib/cx';
import type { Locale } from '@/lib/i18n/routing';
import { FilterSelect } from './filter-select';
import { useJobsNav } from './jobs-nav';

export interface JobFacets {
  countryCodes: string[];
  departments: string[];
  levels: string[];
}

/**
 * The Jobs page hero: photo (another one fades in on hover), glass search,
 * open-count chip, "clear filters" and the three filters. Ported from the old
 * JobsPage. The filter choices come from every published job, not from the
 * current results, so choosing one country no longer hides the others.
 */
export function JobsHero({ total, facets }: { total: number; facets: JobFacets }) {
  const t = useTranslations('jobs.hero');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const { query, pending, update } = useJobsNav();
  const [hover, setHover] = useState(false);

  // The search box: typed text goes to the url 250ms after the last key.
  const [draft, setDraft] = useState(query.q);
  const [sent, setSent] = useState(query.q);
  const [urlQ, setUrlQ] = useState(query.q);
  if (urlQ !== query.q) {
    // The url changed (back button, clear…): show its text, unless it is the
    // text this box just sent and the visitor has typed on since.
    setUrlQ(query.q);
    if (query.q !== sent) {
      setDraft(query.q);
      setSent(query.q);
    }
  }
  const search = useEffectEvent((q: string) => {
    setSent(q);
    update({ q, page: 1 });
  });
  useEffect(() => {
    const q = draft.trim();
    if (q === sent) return;
    const id = window.setTimeout(() => search(q), 250);
    return () => window.clearTimeout(id);
  }, [draft, sent]);

  const countries = facets.countryCodes
    .map((c) => ({ code: c, name: countryName(c, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
    .map((c) => ({ value: c.code, label: `${flagOf(c.code)} ${c.name}` }));

  const hasAnyFilter = !!(query.country || query.department || query.level);

  return (
    <div className="relative overflow-hidden border-b border-slate-200">
      <div className="pointer-events-none absolute inset-0 select-none">
        <Image src="/images/jobs-hero.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <Image
          src="/images/jobs-hero-hover.jpg"
          alt=""
          fill
          sizes="100vw"
          className={cx(
            'object-cover object-center transition-opacity duration-500',
            hover ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div className="absolute inset-0 bg-[radial-gradient(62%_58%_at_18%_18%,rgba(0,0,0,0.38),transparent_62%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-b from-white/0 to-white" />
      </div>

      <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div className="mx-auto w-full max-w-[1280px] px-4 pt-24 pb-12 md:pt-28 md:pb-16">
          <div className="w-full max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{t('badge')}</span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
              <span className="drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">{t('title')}</span>
            </h1>

            <p className="mt-2 text-sm text-white/90 md:text-base">
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{t('subtitle')}</span>
            </p>
          </div>

          <div className="mt-5 w-full">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-white/80" />
                <input
                  type="text"
                  className={cx(
                    'w-full rounded-2xl border-2 border-white/20 bg-white/10',
                    'px-11 py-3 text-sm font-semibold text-white placeholder:text-white/70',
                    'outline-hidden transition',
                    'focus:border-orange-200 focus:ring-2 focus:ring-orange-200/30',
                  )}
                  value={draft}
                  placeholder={t('searchPlaceholder')}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label={t('searchAria')}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between md:justify-end">
                <div
                  className="rounded-2xl border-2 border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white select-none"
                  aria-live="polite"
                >
                  {pending ? tc('loading') : t('openCount', { count: total })}
                </div>

                {hasAnyFilter && (
                  <button
                    type="button"
                    onClick={() => update({ country: '', department: '', level: '', page: 1 })}
                    className={cx(
                      'inline-flex items-center justify-center gap-2',
                      'rounded-2xl border-2 border-white/20 bg-white/10',
                      'px-4 py-3 text-sm font-bold text-white',
                      'transition hover:bg-white/15 active:bg-white/20',
                    )}
                  >
                    <X className="h-4 w-4" />
                    {t('clearFilters')}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <FilterSelect
                label={tc('country')}
                allLabel={tc('all')}
                icon={<Globe2 className="h-4 w-4 text-white/90" />}
                value={query.country}
                options={countries}
                onChange={(v) => update({ country: v, page: 1 })}
              />
              <FilterSelect
                label={tc('department')}
                allLabel={tc('all')}
                icon={<Building2 className="h-4 w-4 text-white/90" />}
                value={query.department}
                options={facets.departments.map((d) => ({ value: d, label: d }))}
                onChange={(v) => update({ department: v, page: 1 })}
              />
              <FilterSelect
                label={tc('level')}
                allLabel={tc('all')}
                icon={<Layers className="h-4 w-4 text-white/90" />}
                value={query.level}
                options={facets.levels.map((l) => ({ value: l, label: l }))}
                onChange={(v) => update({ level: v, page: 1 })}
              />
            </div>

            <div className="mt-3 text-xs font-semibold text-white/85">{t('tip')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
