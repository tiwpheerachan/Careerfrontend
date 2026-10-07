'use client';

import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Loader2, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import s from '@/components/apply/apply.module.css';
import { FieldError } from '@/components/apply/field';
import { Turnstile } from '@/components/apply/turnstile';
import { FORM_EDUCATION_LEVELS } from '@/lib/constants';
import { cx } from '@/lib/cx';
import { Link } from '@/lib/i18n/navigation';
import { FormProvider, Tick, useForm, write } from './controls';
import {
  emptyDraft,
  fieldId,
  OTHER_JOB,
  STEPS,
  stepOf,
  toInput,
  validate,
  type Draft,
  type ErrorKey,
  type Errors,
  type Step,
} from './draft';
import { ContactStep, EducationStep, FamilyStep, PersonalStep, PositionStep, WorkStep, type JobOption } from './steps';

/**
 * The company's paper application form (ใบสมัครงาน), online: one section at a
 * time with a progress bar, a review page, then one POST to
 * /api/v1/application-forms. HR prints it onto the company's blank form from
 * the admin.
 *
 * What is typed is kept in sessionStorage, so a refresh or a step back loses
 * nothing — and only for this tab, since the form is also filled in on shared
 * devices at the office. It is cleared on sending.
 */
const STORAGE_KEY = 'shd.applicationForm.draft.v1';

interface Saved {
  draft: Draft;
  step: number;
}

type Outcome = { kind: 'sent'; id: string } | { kind: 'failed'; message: string };

export function ApplicationFormWizard({ jobs, turnstileSiteKey }: { jobs: JobOption[]; turnstileSiteKey?: string }) {
  const t = useTranslations('applicationForm');
  const te = useTranslations('applicationForm.errors');
  const locale = useLocale();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [restored, setRestored] = useState(false);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // Restore the tab's draft once, after the first render (the server has no sessionStorage).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        const fresh = emptyDraft();
        // Merged over a fresh draft, so a field added since the draft was saved still has its default.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage, once
        setDraft({ ...fresh, ...saved.draft });
        setStep(Math.min(Math.max(0, saved.step), STEPS.length - 1));
      }
    } catch {
      /* no storage, or an old shape: start empty */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || outcome?.kind === 'sent') return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, step } satisfies Saved));
    } catch {
      /* storage full or blocked: the form still works, it just will not survive a refresh */
    }
  }, [draft, step, restored, outcome]);

  const set = (path: string, value: unknown) => {
    setDraft((current) => write(current, path, value));
    // Choosing a job answers the "a job or a position" error, which is kept on positionOther.
    const answers = path === 'jobCode' ? [path, 'positionOther'] : [path];
    setErrors((current) => {
      if (!answers.some((p) => current[p])) return current;
      return Object.fromEntries(Object.entries(current).filter(([p]) => !answers.includes(p)));
    });
  };

  const current: Step = STEPS[step]!;
  const last = step === STEPS.length - 1;

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /** Focus the first field with an error, once it is on screen. */
  const focusFirst = (found: Errors) => {
    const first = Object.keys(found)[0];
    if (!first) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId(first));
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const goTo = (index: number) => {
    setStep(index);
    setOutcome(null);
    scrollTop();
  };

  const next = () => {
    const found = validate(draft, locale, current);
    setErrors(found);
    if (Object.keys(found).length) return focusFirst(found);
    goTo(step + 1);
  };

  const submit = async () => {
    const found = validate(draft, locale);
    if (turnstileSiteKey && !turnstileToken) found.turnstileToken = 'required';
    setErrors(found);
    if (Object.keys(found).length) {
      const firstStep = STEPS.indexOf(stepOf(Object.keys(found)[0]!));
      if (firstStep !== step) setStep(firstStep);
      return focusFirst(found);
    }

    setSending(true);
    setOutcome(null);
    const { input, educationLevels } = toInput(draft, locale, turnstileToken || undefined);
    try {
      const response = await fetch(`/api/v1/application-forms?locale=${locale}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(input),
      });
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        error?: { message?: string; issues?: Array<{ path: string; message: string }> };
      } | null;

      if (response.status === 201 && body?.id) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          /* nothing to clear */
        }
        setOutcome({ kind: 'sent', id: body.id });
        scrollTop();
        return;
      }
      setTurnstileReset((n) => n + 1);
      setTurnstileToken('');
      if (response.status === 400 && body?.error?.issues?.length) {
        // The server's paths are the API's: put them back on the draft's fields.
        const fromServer: Errors = {};
        for (const issue of body.error.issues) {
          const parts = issue.path.split('.');
          if (parts[0] === 'education' && educationLevels[Number(parts[1])])
            parts[1] = educationLevels[Number(parts[1])]!;
          if (parts[0] === 'jobCode') parts[0] = 'positionOther';
          fromServer[parts.join('.')] ??= 'invalid' as ErrorKey;
        }
        setErrors(fromServer);
        const firstStep = STEPS.indexOf(stepOf(Object.keys(fromServer)[0]!));
        setStep(firstStep);
        focusFirst(fromServer);
        setOutcome({ kind: 'failed', message: body.error.message ?? te('failed') });
        return;
      }
      setOutcome({
        kind: 'failed',
        message: response.status === 429 ? te('rateLimited') : (body?.error?.message ?? te('failed')),
      });
    } catch {
      setOutcome({ kind: 'failed', message: te('network') });
    } finally {
      setSending(false);
    }
  };

  const startOver = () => {
    setDraft(emptyDraft());
    setErrors({});
    setOutcome(null);
    setStep(0);
    scrollTop();
  };

  if (outcome?.kind === 'sent') {
    return (
      <div ref={topRef} className={cx(s.glassCard, 'rounded-3xl p-6 text-center sm:p-10')}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-black tracking-tight text-slate-900 sm:text-2xl" role="status">
          {t('success.title')}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t('success.body')}</p>
        <p className="mt-3 text-xs break-all text-slate-500">{t('success.reference', { id: outcome.id })}</p>
        <p className="mt-1 text-xs text-slate-500">{t('fields.signNote')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={startOver} className="btn btn-ghost">
            {t('success.again')}
          </button>
          <Link href="/jobs" className="btn btn-primary">
            {t('success.jobs')}
          </Link>
        </div>
      </div>
    );
  }

  const stepErrors = Object.keys(errors).some((path) => stepOf(path) === current);

  return (
    <FormProvider value={{ draft, set, errors }}>
      <div ref={topRef} className={cx(s.glassCard, 'scroll-mt-28 rounded-3xl p-5 sm:p-8')}>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{t('title')}</h1>
            <p className="mt-1 text-sm text-slate-600">{t('subtitle')}</p>
          </div>
        </div>

        <Progress step={step} onJump={(index) => index < step && goTo(index)} />

        <div className={cx('mt-6', s.softHr)} />

        <h2 className="mt-6 text-base font-black text-slate-900">{t(`steps.${current}`)}</h2>

        <div className="mt-4">
          {current === 'position' && <PositionStep jobs={jobs} />}
          {current === 'personal' && <PersonalStep />}
          {current === 'contact' && <ContactStep />}
          {current === 'family' && <FamilyStep />}
          {current === 'education' && <EducationStep />}
          {current === 'work' && <WorkStep />}
          {current === 'review' && (
            <Review jobs={jobs} onEdit={goTo}>
              <Tick path="certified" required>
                {t('fields.certify')}
              </Tick>
              <p className="text-xs text-slate-500">{t('fields.signNote')}</p>
              {turnstileSiteKey ? (
                <div>
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    language={locale === 'zh' ? 'zh-cn' : locale}
                    resetKey={turnstileReset}
                    onToken={(token) => {
                      setTurnstileToken(token);
                      if (token) set('turnstileToken', token);
                    }}
                  />
                  {errors.turnstileToken ? <FieldError id="af-turnstile" error={te('verify')} /> : null}
                </div>
              ) : null}
            </Review>
          )}
        </div>

        {stepErrors || outcome?.kind === 'failed' ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{outcome?.kind === 'failed' ? outcome.message : te('stepHasErrors')}</span>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              className="btn btn-ghost inline-flex items-center gap-2"
              onClick={() => goTo(step - 1)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('back')}
            </button>
          ) : (
            <span />
          )}
          {last ? (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-60"
              disabled={sending}
              onClick={() => void submit()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {sending ? t('submitting') : t('submit')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary inline-flex items-center gap-2" onClick={next}>
              {t('next')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>{t('draftNote')}</span>
          <button type="button" className="underline hover:text-slate-700" onClick={startOver}>
            {t('clearDraft')}
          </button>
        </div>
      </div>
    </FormProvider>
  );
}

/** "Step 2 of 7", a bar, and the step names (done ones can be jumped back to). */
function Progress({ step, onJump }: { step: number; onJump: (index: number) => void }) {
  const t = useTranslations('applicationForm');
  const percent = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{t('stepOf', { step: step + 1, total: STEPS.length })}</span>
        <span>{percent}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label={t('stepOf', { step: step + 1, total: STEPS.length })}
      >
        <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      <ol className="mt-3 hidden gap-1 md:flex">
        {STEPS.map((name, index) => (
          <li key={name} className="min-w-0 flex-1">
            <button
              type="button"
              disabled={index >= step}
              onClick={() => onJump(index)}
              aria-current={index === step ? 'step' : undefined}
              className={cx(
                'w-full truncate rounded-lg px-1 py-1 text-[11px] font-semibold transition',
                index === step && 'text-blue-700',
                index < step && 'text-slate-600 hover:bg-slate-100',
                index > step && 'text-slate-400',
              )}
            >
              {t(`steps.${name}`)}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The last step: what was filled in, by section, each with its "Edit". */
function Review({
  jobs,
  onEdit,
  children,
}: {
  jobs: JobOption[];
  onEdit: (index: number) => void;
  children: ReactNode;
}) {
  const t = useTranslations('applicationForm');
  const f = useTranslations('applicationForm.fields');
  const locale = useLocale();
  const { draft } = useForm();
  const join = (...parts: string[]) => parts.filter((p) => p.trim()).join(' ');
  const position =
    draft.jobCode === OTHER_JOB ? draft.positionOther : (jobs.find((j) => j.code === draft.jobCode)?.title ?? '');

  const sections: Array<{ step: Step; rows: Array<[string, string]> }> = [
    {
      step: 'position',
      rows: [
        [f('letterhead'), draft.letterhead ? f(`letterheads.${draft.letterhead}`) : ''],
        [f('job'), position],
        [f('expectedSalary'), draft.expectedSalary],
      ],
    },
    {
      step: 'personal',
      rows: [
        [f('nameTh'), draft.nameTh],
        [f('nameEn'), draft.nameEn],
        [f('nickname'), draft.nickname],
        [f('gender'), draft.gender ? f(`genders.${draft.gender}`) : ''],
        [
          f('birthDate'),
          draft.birthDate
            ? new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : locale, {
                dateStyle: 'long',
                timeZone: 'UTC',
              }).format(new Date(`${draft.birthDate}T00:00:00Z`))
            : '',
        ],
        [f('nationality'), draft.nationality],
      ],
    },
    {
      step: 'contact',
      rows: [
        [f('mobile'), draft.mobile],
        [f('email'), draft.email],
        [f('homePhone'), draft.homePhone],
        [
          f('address'),
          join(
            draft.address.houseNo,
            draft.address.moo && `${f('moo')} ${draft.address.moo}`,
            draft.address.soi && `${f('soi')} ${draft.address.soi}`,
            draft.address.road && `${f('road')} ${draft.address.road}`,
            draft.address.subdistrict,
            draft.address.district,
            draft.address.province,
            draft.address.postalCode,
          ),
        ],
      ],
    },
    {
      step: 'family',
      rows: [
        [f('fatherName'), draft.family.fatherName],
        [f('motherName'), draft.family.motherName],
        [f('marital'), draft.marriage.status ? f(`maritals.${draft.marriage.status}`) : ''],
        [f('military'), draft.military ? f(`militaries.${draft.military}`) : ''],
      ],
    },
    {
      step: 'education',
      rows: [
        ...FORM_EDUCATION_LEVELS.filter((level) => draft.education[level].institute.trim()).map(
          (level): [string, string] => [
            f(`educationLevels.${level}`),
            join(draft.education[level].institute, draft.education[level].major),
          ],
        ),
        [f('language'), draft.skills.language],
        [f('computer'), draft.skills.computer],
      ],
    },
    {
      step: 'work',
      rows: [
        [f('currentJob'), draft.hasCurrentJob ? join(draft.currentJob.position, draft.currentJob.company) : f('noJob')],
        [
          f('previousJob'),
          draft.hasPreviousJob ? join(draft.previousJob.position, draft.previousJob.company) : f('noJob'),
        ],
        [f('emergency'), join(draft.emergency.name, draft.emergency.phone)],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{f('reviewHint')}</p>
      {sections.map(({ step, rows }) => (
        <section key={step} className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-slate-900">{t(`steps.${step}`)}</h3>
            <button
              type="button"
              className="text-xs font-semibold text-blue-700 hover:underline"
              onClick={() => onEdit(STEPS.indexOf(step))}
            >
              {t('edit')}
            </button>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[minmax(0,180px)_1fr]">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className="min-w-0 font-medium break-words text-slate-900">{value.trim() || f('none')}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <div className="space-y-4 rounded-3xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">{children}</div>
    </div>
  );
}
