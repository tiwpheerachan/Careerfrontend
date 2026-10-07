import { ArrowLeft, ClipboardCheck, Download, ExternalLink, FileText, Globe, Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { DeleteApplication } from '@/components/admin/applications/delete-application';
import { Field, formatSize, languageName, monthRange, Section } from '@/components/admin/applications/detail-parts';
import { backHref } from '@/components/admin/applications/list-query';
import { Notes } from '@/components/admin/applications/notes';
import { StageBadge, StageHistory, StagePanel, StageProvider } from '@/components/admin/applications/stage';
import { presentApplication } from '@/lib/api/present';
import { formatDate, formatDateTime } from '@/lib/admin/format';
import { countryName } from '@/lib/countries';
import { NotFoundError } from '@/lib/errors';
import type { AdminLocale } from '@/lib/i18n/admin';
import type { ApplicationDetail } from '@/lib/repositories/applications';
import { store } from '@/lib/store';
import { abilitiesOf, requireAdminPage } from '@/lib/auth/admin';

async function load(id: string): Promise<ApplicationDetail> {
  try {
    return await store().applications.get(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

/** The job's title in the admin's language (the repository's summary carries the Thai one). */
async function titleIn(job: ApplicationDetail['job'], locale: AdminLocale): Promise<string | null> {
  try {
    const tr = (await store().jobs.get(job.id)).translations;
    return tr[locale]?.title || job.title;
  } catch {
    return job.title;
  }
}

/** /admin/applications/{id} — one applicant in full, with stage, notes and documents. */
export default async function ApplicationDetailPage({ params, searchParams }: PageProps<'/admin/applications/[id]'>) {
  const actor = await requireAdminPage({ resource: 'applications', level: 'view' });
  const { id } = await params;
  const { from } = await searchParams;
  // As the API presents it: files carry their download endpoint, never the storage path.
  const a = presentApplication(await load(id));
  const locale = (await getLocale()) as AdminLocale;
  const t = await getTranslations('applications.detail');
  const jobTitle = await titleIn(a.job, locale);
  const back = backHref(typeof from === 'string' ? from : undefined);
  const name = `${a.firstName} ${a.lastName}`;

  const resume = a.files.filter((f) => f.kind === 'RESUME');
  const others = a.files.filter((f) => f.kind !== 'RESUME');

  return (
    <StageProvider initial={{ stage: a.stage, stageChangedAt: a.stageChangedAt, stageHistory: a.stageHistory }}>
      <div className="[contain:inline-size]">
        <Link href={back} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </Link>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-gray-900">{name}</h1>
              <StageBadge />
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {t('appliedFor')} <span className="font-semibold text-gray-700">{jobTitle ?? a.job.code}</span>
              {jobTitle && <span className="text-gray-400"> ({a.job.code})</span>} ·{' '}
              {t('appliedAt', { date: formatDateTime(a.createdAt, locale) })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {abilitiesOf(actor).applications.edit && (
              <Link
                href={`/admin/interviews/candidate/${encodeURIComponent(`application:${a.id}`)}`}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                <ClipboardCheck className="h-4 w-4 text-blue-600" />
                {t('evaluate')}
              </Link>
            )}
            <DeleteApplication id={a.id} name={name} backHref={back} />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left: the applicant */}
          <div className="min-w-0 space-y-5 lg:col-span-2">
            <Section title={t('contact')}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={t('email')}
                  value={
                    <a
                      className="inline-flex items-center gap-1 break-all text-blue-700 hover:underline"
                      href={`mailto:${a.email}`}
                    >
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {a.email}
                    </a>
                  }
                />
                <Field
                  label={t('phone')}
                  value={
                    <a
                      className="inline-flex items-center gap-1 hover:text-blue-700"
                      href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}
                    >
                      <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {a.phone}
                    </a>
                  }
                />
                <Field
                  label={t('address')}
                  value={
                    a.address ? (
                      <span className="inline-flex items-start gap-1">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                        {a.address}
                      </span>
                    ) : undefined
                  }
                />
                <Field
                  label={t('website')}
                  value={
                    a.websiteUrl ? (
                      <a
                        className="inline-flex items-center gap-1 break-all text-blue-700 hover:underline"
                        href={a.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        {a.websiteUrl.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3 shrink-0 text-blue-400" />
                      </a>
                    ) : undefined
                  }
                />
              </div>
            </Section>

            <Section title={t('position')}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={t('jobCountry')} value={countryName(a.job.countryCode, locale)} />
                <Field label={t('department')} value={a.job.department} />
                <Field label={t('level')} value={a.job.level} />
                <Field label={t('residenceCountry')} value={a.residenceCountry} />
                <Field label={t('visaRequired')} value={a.visaRequired ? t('yes') : t('no')} />
                <Field
                  label={t('availableFrom')}
                  value={a.availableFrom ? formatDate(a.availableFrom, locale) : undefined}
                />
                <Field label={t('source')} value={a.sourceChannel} />
                <Field label={t('formLanguage')} value={languageName(a.locale, locale)} />
              </div>
            </Section>

            {a.skills.length > 0 && (
              <Section title={t('skills')}>
                <div className="flex flex-wrap gap-2">
                  {a.skills.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {a.educations.length > 0 && (
              <Section title={t('education')}>
                <div className="space-y-3">
                  {a.educations.map((e, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 p-3 text-sm">
                      <div className="font-semibold text-gray-900">{e.institute || '—'}</div>
                      <div className="text-gray-600">
                        {[e.level ? t(`educationLevel.${e.level}`) : null, e.program].filter(Boolean).join(' · ')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {monthRange(e.startMonth, e.endMonth, locale)}
                        {e.gpa ? `${e.startMonth || e.endMonth ? ' · ' : ''}${t('gpa', { gpa: e.gpa })}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {a.experiences.length > 0 && (
              <Section title={t('experience')}>
                <div className="space-y-3">
                  {a.experiences.map((x, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 p-3 text-sm">
                      <div className="font-semibold text-gray-900">{x.role || '—'}</div>
                      <div className="text-gray-600">{x.company}</div>
                      <div className="text-xs text-gray-400">{monthRange(x.startMonth, x.endMonth, locale)}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* Right: what the recruiter does */}
          <div className="min-w-0 space-y-5">
            <Section title={t('stagePanel')}>
              <StagePanel applicationId={a.id} />
            </Section>

            <Section title={t('documents')}>
              <div className="space-y-2">
                {resume.length === 0 && <div className="text-sm text-gray-400">{t('noResume')}</div>}
                {[...resume, ...others].map((f) => (
                  <a
                    key={f.id}
                    href={f.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('download', { name: f.fileName })}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm hover:bg-gray-50"
                  >
                    <FileText
                      className={
                        f.kind === 'ATTACHMENT' ? 'h-4 w-4 shrink-0 text-gray-500' : 'h-4 w-4 shrink-0 text-blue-600'
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-gray-900">{t(`fileKind.${f.kind}`)}</span>
                      <span className="block truncate text-xs text-gray-400">
                        {f.fileName} · {formatSize(f.sizeBytes, locale)}
                      </span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-gray-400" />
                  </a>
                ))}
              </div>
            </Section>

            <Section title={t('notes')}>
              <Notes applicationId={a.id} notes={a.notes} />
            </Section>

            <Section title={t('history')}>
              <StageHistory />
            </Section>
          </div>
        </div>
      </div>
    </StageProvider>
  );
}
