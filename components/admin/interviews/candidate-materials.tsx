import { FileDown, FileText } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { languagesOf, type ApplicationFormAnswers } from '@/lib/application-form/schema';
import type { AdminLocale } from '@/lib/i18n/admin';
import type { ApplicationDetail } from '@/lib/repositories/applications';
import { formatMonth } from '@/components/admin/applications/detail-parts';

/** An application form, as far as an invited evaluator sees it. */
export interface FormMaterials {
  answers: ApplicationFormAnswers;
  /** A résumé/CV was sent with it. */
  hasResume: boolean;
  /** The photo as a data URL, or null. */
  photo: string | null;
}

/**
 * What an invited evaluator sees of the candidate: the application itself —
 * education, experience, skills and the files (résumé and the rest) — or, for
 * an application form, the photo, the résumé and the work profile: education,
 * the jobs (no salary, benefits or reason for leaving), languages and skills.
 * The form's PDF, redacted (no pay on the department's). Never the contact details, the hiring
 * stage or HR's internal notes: those are not the evaluator's.
 */
export async function CandidateMaterials({
  token,
  application,
  form,
  pending = null,
}: {
  token: string;
  application: ApplicationDetail | null;
  form: FormMaterials | null;
  /** A candidate HR added before they had an application: no application to show, perhaps a résumé. */
  pending?: { hasResume: boolean } | null;
}) {
  const t = await getTranslations('invitee.materials');
  const tl = await getTranslations('applications.detail');
  const locale = (await getLocale()) as AdminLocale;
  const link =
    'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-blue-300 hover:bg-blue-50';

  if (!application && !form && !pending) return null;

  return (
    <section className="card p-6">
      <h2 className="text-sm font-bold text-gray-900">{t('title')}</h2>
      {form && <FormProfile token={token} form={form} link={link} />}
      {pending && (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-gray-600">{t('noApplication')}</p>
          {pending.hasResume && (
            <a href={`/api/v1/evaluate/${token}/resume`} target="_blank" rel="noreferrer" className={link}>
              <FileDown className="h-4 w-4 text-blue-600" /> {t('resume')}
            </a>
          )}
        </div>
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

/** An application form's photo, files and work profile — never its salaries or personal details. */
async function FormProfile({ token, form, link }: { token: string; form: FormMaterials; link: string }) {
  const t = await getTranslations('invitee.materials');
  const locale = (await getLocale()) as AdminLocale;
  const a = form.answers;
  const languages = languagesOf(a.skills, (code) => t(`languageNames.${code}`));
  const level = (value: string | null) => (value ? t(`skillLevels.${value}`) : '-');
  const jobs = [
    { title: t('currentJob'), job: a.currentJob, current: true },
    { title: t('previousJob'), job: a.previousJob, current: false },
  ].filter(({ job }) => job && (job.company || job.position));
  const s = a.skills;
  const typing = [
    s.typingThWpm !== null ? t('typingTh', { wpm: s.typingThWpm }) : null,
    s.typingEnWpm !== null ? t('typingEn', { wpm: s.typingEnWpm }) : null,
  ].filter(Boolean);
  const licences = [s.motorcycleLicense ? t('motorcycle') : null, s.carLicense ? t('car') : null].filter(Boolean);

  return (
    <div className="mt-3 flex flex-col gap-5 text-sm sm:flex-row">
      {form.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL from storage; nothing to optimise
        <img
          src={form.photo}
          alt={t('photo')}
          className="aspect-[4/5] w-28 shrink-0 self-start rounded-xl border border-gray-200 object-cover"
        />
      )}
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
          {form.hasResume && (
            <a href={`/api/v1/evaluate/${token}/resume`} target="_blank" rel="noreferrer" className={link}>
              <FileDown className="h-4 w-4 text-blue-600" /> {t('resume')}
            </a>
          )}
          <a href={`/api/v1/evaluate/${token}/application-form`} target="_blank" rel="noreferrer" className={link}>
            <FileText className="h-4 w-4 text-blue-600" /> {t('applicationFormPdf')}
          </a>
        </div>
        {a.education.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700">{t('education')}</h3>
            <ul className="mt-1 space-y-1 text-gray-700">
              {a.education.map((e) => (
                <li key={e.level}>
                  {[t(`educationLevels.${e.level}`), e.institute, e.major, e.country].filter(Boolean).join(' · ')}
                  {e.gpa ? ` · ${t('gpa', { gpa: e.gpa })}` : ''}
                  {e.graduationYear ? ` · ${t('graduated', { year: e.graduationYear })}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {jobs.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700">{t('experience')}</h3>
            <ul className="mt-1 space-y-2 text-gray-700">
              {jobs.map(({ title, job, current }) => (
                <li key={title}>
                  <span className="text-xs font-semibold text-gray-500">{title}</span>
                  <div>
                    {[job!.position, job!.company].filter(Boolean).join(' · ')}
                    {job!.from
                      ? ` (${formatMonth(job!.from, locale)} – ${
                          formatMonth(job!.to, locale) ?? (current ? t('present') : '')
                        })`
                      : ''}
                  </div>
                  {job!.duties && <div className="text-gray-600">{job!.duties}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {languages.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700">{t('languages')}</h3>
            <ul className="mt-1 space-y-1 text-gray-700">
              {languages.map((l) => (
                <li key={l.name}>
                  {l.name} — {t('levels', { speak: level(l.speak), read: level(l.read), write: level(l.write) })}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(s.computer || typing.length > 0 || licences.length > 0) && (
          <div>
            <h3 className="font-semibold text-gray-700">{t('skills')}</h3>
            <ul className="mt-1 space-y-1 text-gray-700">
              {s.computer && <li>{t('computer', { programs: s.computer })}</li>}
              {typing.length > 0 && <li>{typing.join(' · ')}</li>}
              {licences.length > 0 && <li>{t('licences', { list: licences.join(', ') })}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
