import { FileDown, FileText } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { AdminLocale } from '@/lib/i18n/admin';
import type { ApplicationDetail } from '@/lib/repositories/applications';
import { formatMonth } from '@/components/admin/applications/detail-parts';

/**
 * What an invited evaluator sees of the candidate: the application itself —
 * education, experience, skills and the files (résumé and the rest), or the
 * application form as a PDF. Never the contact details, the hiring stage or
 * HR's internal notes: those are not the evaluator's.
 */
export async function CandidateMaterials({
  token,
  application,
  hasApplicationForm,
}: {
  token: string;
  application: ApplicationDetail | null;
  hasApplicationForm: boolean;
}) {
  const t = await getTranslations('invitee.materials');
  const tl = await getTranslations('applications.detail');
  const locale = (await getLocale()) as AdminLocale;
  const link =
    'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50';

  if (!application && !hasApplicationForm) return null;

  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold text-gray-900">{t('title')}</h2>
      {hasApplicationForm && (
        <a
          href={`/api/v1/evaluate/${token}/application-form`}
          target="_blank"
          rel="noreferrer"
          className={`${link} mt-3`}
        >
          <FileText className="h-4 w-4 text-blue-600" /> {t('applicationFormPdf')}
        </a>
      )}
      {application && (
        <div className="mt-3 space-y-4 text-sm">
          {application.files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {application.files.map((file) => (
                <a
                  key={file.id}
                  href={`/api/v1/evaluate/${token}/files/${file.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={link}
                >
                  <FileDown className="h-4 w-4 text-blue-600" />
                  {tl(`fileKind.${file.kind}`)} · {file.fileName}
                </a>
              ))}
            </div>
          )}
          {application.educations.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700">{tl('education')}</h3>
              <ul className="mt-1 space-y-1 text-gray-700">
                {application.educations.map((e, i) => (
                  <li key={i}>
                    {[e.level ? tl(`educationLevel.${e.level}`) : null, e.institute, e.program]
                      .filter(Boolean)
                      .join(' · ')}
                    {e.gpa ? ` · ${tl('gpa', { gpa: e.gpa })}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {application.experiences.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700">{tl('experience')}</h3>
              <ul className="mt-1 space-y-1 text-gray-700">
                {application.experiences.map((x, i) => (
                  <li key={i}>
                    {[x.role, x.company].filter(Boolean).join(' · ')}
                    {x.startMonth
                      ? ` (${formatMonth(x.startMonth, locale)} – ${formatMonth(x.endMonth, locale) ?? t('present')})`
                      : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {application.skills.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700">{tl('skills')}</h3>
              <p className="mt-1 text-gray-700">{application.skills.join(' · ')}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
