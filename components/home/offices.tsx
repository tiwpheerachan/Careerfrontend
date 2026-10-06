'use client';

import { ArrowRight, Briefcase, ChevronLeft, ChevronRight, Flag, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getImageProps } from 'next/image';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { flagOf } from '@/lib/countries';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import { OFFICES, officeBg, officeBgMobile, type HomeJob } from './offices-data';
import styles from './offices.module.css';

const PAGE_SIZE = 4;

function GlobePill({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="rounded-2xl border border-white/30 bg-black/35 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
}

// three.js is big and WebGL needs a browser: load it in its own chunk, client-side only.
const Globe = dynamic(() => import('./globe'), { ssr: false, loading: GlobeLoading });

function GlobeLoading() {
  const t = useTranslations('common');
  return <GlobePill label={t('loading')} />;
}

/** Per-office background; the portrait image up to 640px. */
function OfficeBackground({ code, alt }: { code: string; alt: string }) {
  const common = { alt, fill: true, sizes: '100vw' } as const;
  const { props: mobile } = getImageProps({ ...common, src: officeBgMobile(code) });
  const { props: desktop } = getImageProps({ ...common, src: officeBg(code) });
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={mobile.srcSet} sizes={mobile.sizes} />
      <img
        {...desktop}
        alt={alt}
        className={cx(
          'absolute inset-0 h-full w-full object-cover',
          'scale-[1.03] will-change-transform',
          styles.fadeIn,
        )}
        draggable={false}
      />
    </picture>
  );
}

export function Offices({ jobs }: { jobs: HomeJob[] }) {
  const t = useTranslations('home.offices');
  const tc = useTranslations('common');

  const [officeCode, setOfficeCode] = useState(OFFICES[0]?.code ?? 'TH');
  const [page, setPage] = useState(1);

  const labels = useMemo(() => Object.fromEntries(OFFICES.map((o) => [o.code, t(`items.${o.code}.label`)])), [t]);
  const label = labels[officeCode] ?? officeCode;

  function selectOffice(code: string) {
    setOfficeCode(code);
    setPage(1);
  }

  const officeJobs = useMemo(() => jobs.filter((j) => j.countryCode === officeCode), [jobs, officeCode]);
  const totalPages = Math.max(1, Math.ceil(officeJobs.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageJobs = officeJobs.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const chip = 'inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/35 px-3 py-1';

  return (
    <section className="relative -mt-px pt-0">
      <div className="relative right-1/2 left-1/2 mx-[-50vw] w-screen">
        <div className="relative overflow-hidden rounded-none">
          <div className="relative min-h-[260px] md:min-h-[240px] lg:min-h-[220px]">
            <OfficeBackground code={officeCode} alt={`${t('badges.office')} ${label}`} />

            {/* overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(75%_70%_at_50%_18%,rgba(255,255,255,0.78),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_18%_35%,rgba(16,185,129,0.14),transparent_62%)]" />

            {/* header */}
            <div className="relative z-10">
              <div className="container-page px-4 pt-10 md:pt-14">
                <div className="mx-auto max-w-[1020px] text-center">
                  <div className="text-xs font-semibold tracking-wide text-emerald-700">{t('kicker')}</div>

                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{t('title')}</h2>

                  <p className="mt-2 text-sm text-slate-700">{t('subtitle')}</p>

                  {/* dropdown row */}
                  <div className="mx-auto mt-6 flex max-w-[720px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <div className="relative w-full sm:w-[460px]">
                      <Select value={officeCode} onValueChange={selectOffice}>
                        <SelectTrigger
                          aria-label={t('dropdownAria')}
                          className="h-auto w-full rounded-2xl border border-white/55 bg-white/45 py-3 pr-3 pl-4 text-sm font-semibold text-slate-900 outline-hidden transition focus:border-emerald-200 focus:ring-4 focus:ring-emerald-100 focus-visible:border-emerald-200 focus-visible:ring-4 focus-visible:ring-emerald-100 data-[size=default]:h-auto [&>svg:last-child]:text-slate-600"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" className="rounded-xl">
                          {OFFICES.map((o) => (
                            <SelectItem key={o.code} value={o.code}>
                              {`${flagOf(o.code)} ${labels[o.code]}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/55 bg-white/45 px-4 py-3 text-sm font-semibold text-slate-900">
                      <Briefcase className="h-4 w-4 text-slate-800" />
                      {t('openings', { count: officeJobs.length })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* mobile chips */}
            <div className="absolute top-4 right-0 left-0 z-20 px-4 md:hidden">
              <div
                className={cx(
                  'flex gap-2 overflow-x-auto',
                  'rounded-3xl border border-white/55 bg-white/35 p-2 backdrop-blur-xl',
                  'shadow-[0_18px_70px_rgba(0,0,0,0.18)]',
                  styles.floatIn,
                )}
              >
                {OFFICES.map((o) => {
                  const active = o.code === officeCode;
                  return (
                    <button
                      key={o.code}
                      type="button"
                      onClick={() => selectOffice(o.code)}
                      aria-pressed={active}
                      className={cx(
                        'shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
                        'active:scale-[0.98]',
                        active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_10px_26px_rgba(16,185,129,0.20)]'
                          : 'border-white/55 bg-white/20 text-slate-900 hover:bg-white/35',
                      )}
                    >
                      <span className="mr-1">{flagOf(o.code)}</span>
                      {labels[o.code]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* content */}
            <div className="relative z-10">
              <div className="mx-auto w-full max-w-[1760px] px-4 pt-0 pb-4 sm:px-6 md:px-10 md:pb-6 lg:px-16">
                <div className="mt-7 md:mt-9 lg:mt-10">
                  <div className="w-full">
                    {/* mb-4: the space the old empty footer line took */}
                    <div className="mb-4 grid items-start gap-8 md:grid-cols-[minmax(0,920px)_minmax(0,520px)] md:gap-14 xl:gap-16">
                      {/* LEFT: Globe */}
                      <div className={cx('flex min-w-0 items-start justify-center pt-0 md:pt-1', styles.rise)}>
                        <div className="w-full px-0 sm:px-4 md:px-5 lg:px-6">
                          <div className="sm:translate-y-[-6%] md:translate-y-[-8%]">
                            {/* mb-3: the space the old empty caption row took */}
                            <div className="relative mb-3 min-w-0">
                              <div className="relative h-[320px] w-full p-3 sm:h-[460px] sm:p-4 md:h-[560px] lg:h-[600px]">
                                <div className="relative h-full w-full">
                                  <Globe
                                    offices={OFFICES}
                                    labels={labels}
                                    activeCode={officeCode}
                                    onSelect={selectOffice}
                                    loadingLabel={tc('loading')}
                                    errorFallback={
                                      <div className="flex h-full w-full items-center justify-center">
                                        <div className="rounded-2xl border border-white/35 bg-black/35 px-4 py-3 text-xs font-semibold text-white backdrop-blur-sm">
                                          {t('globe.unavailable')}
                                          <div className="mt-1 text-[11px] font-medium text-white/70">
                                            {t('globe.unavailableHint')}
                                          </div>
                                        </div>
                                      </div>
                                    }
                                  />
                                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(70%_60%_at_50%_30%,rgba(255,255,255,0.14),transparent_65%)]" />
                                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(65%_55%_at_35%_40%,rgba(16,185,129,0.10),transparent_62%)]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: jobs card */}
                      <div
                        className={cx(
                          'mt-2 min-w-0 pt-0 md:mt-10 md:pt-2',
                          'border-0 bg-transparent p-0 shadow-none backdrop-blur-0',
                          'shadow-[0_28px_120px_rgba(0,0,0,0.10)]',
                          'md:-translate-x-6 lg:-translate-x-10',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-800">
                          <span className={chip}>
                            <Flag className="h-3.5 w-3.5" />
                            <span className="mr-1">{flagOf(officeCode)}</span>
                            {label}
                          </span>
                          <span className={chip}>
                            <MapPin className="h-3.5 w-3.5" />
                            {t(`items.${officeCode}.tagline`)}
                          </span>
                          <span className={chip}>
                            <Briefcase className="h-3.5 w-3.5" />
                            {t('badges.openings', { count: officeJobs.length })}
                          </span>
                        </div>

                        <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                          {t('cardTitle')}
                        </div>
                        <div className="mt-1 text-sm text-slate-700">{t('cardSubtitle')}</div>

                        {officeJobs.length === 0 ? (
                          <div className="mt-4 flex min-h-[88px] items-center justify-center rounded-2xl border border-white/50 bg-white/20 px-4 py-6 text-center text-sm font-semibold text-slate-800 backdrop-blur-sm sm:min-h-[188px]">
                            {t('noOpenings', { office: label })}
                          </div>
                        ) : (
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {Array.from({ length: PAGE_SIZE }, (_, i) => {
                              const job = pageJobs[i];
                              if (!job) {
                                return (
                                  <div
                                    key={`empty-${i}`}
                                    className="h-[88px] rounded-2xl border border-white/50 bg-white/20 backdrop-blur-sm"
                                  />
                                );
                              }
                              return (
                                <Link
                                  key={job.code}
                                  href={`/jobs/${job.code}`}
                                  className={cx(
                                    'group min-w-0 rounded-2xl border border-white/60 bg-white/40 p-4 backdrop-blur-xl',
                                    'transition hover:-translate-y-0.5 hover:bg-white/55',
                                    'hover:shadow-[0_18px_60px_rgba(0,0,0,0.10)]',
                                  )}
                                >
                                  <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="line-clamp-2 min-w-0 text-sm font-black wrap-break-word text-slate-900">
                                        {job.title}
                                      </div>
                                      <div className="mt-1 line-clamp-1 min-w-0 text-xs wrap-break-word text-slate-700">
                                        {[job.department, job.level].filter(Boolean).join(t('jobCard.deptLevelSep'))}
                                      </div>
                                    </div>
                                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setPage(Math.max(1, current - 1))}
                            disabled={current <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            {t('pagination.prev')}
                          </button>

                          <div className="text-xs font-semibold text-slate-800">
                            {t('pagination.page', { page: current, total: totalPages })}
                          </div>

                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setPage(Math.min(totalPages, current + 1))}
                            disabled={current >= totalPages}
                          >
                            {t('pagination.next')}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link
                            href={{ pathname: '/jobs', query: { country: officeCode } }}
                            className={cx(
                              'inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black',
                              'bg-[#cd902e] text-white',
                              'shadow-[0_18px_60px_rgba(111,87,48,0.35)]',
                              'transition hover:-translate-y-0.5 hover:bg-[#c39227e2]',
                              'active:scale-[0.98]',
                            )}
                          >
                            {t('actions.viewAllInOffice', { office: label })}
                            <ArrowRight className="h-4 w-4" />
                          </Link>

                          <Link
                            href="/jobs"
                            className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            {t('actions.goAllJobs')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
