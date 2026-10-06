'use client';

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { ApplicationFields } from '@/lib/api/schemas';
import { EDUCATION_LEVELS } from '@/lib/constants';
import { cx } from '@/lib/cx';
import s from './apply.module.css';
import { ApplySelect } from './apply-select';
import { Field, FieldError, inputClass, invalidProps } from './field';
import { acceptOf, checkFile, fileKey, MAX_ATTACHMENTS } from './files';
import { MonthRange } from './month-year-picker';
import { MAX_EDUCATIONS, MAX_EXPERIENCES, OTHER_COUNTRY, PHONE_CODES, RESIDENCE_COUNTRIES } from './options';
import { SkillsPicker } from './skills-picker';
import { sendApplication, type Issue } from './submit';
import { SubmitDialog, type Phase } from './submit-dialog';
import { Turnstile } from './turnstile';

export interface ApplyJob {
  code: string;
  title: string;
  location: string | null;
}

type Edu = { key: number; level: string; school: string; from: string; to: string };
type Exp = { key: number; company: string; title: string; from: string; to: string };
type Errors = Record<string, string>;
type Result = { ok: true; id: string } | { ok: false; message: string } | null;

let nextKey = 1;
const newEdu = (): Edu => ({ key: nextKey++, level: '', school: '', from: '', to: '' });
const newExp = (): Exp => ({ key: nextKey++, company: '', title: '', from: '', to: '' });

const digitsOf = (value: string) => value.replace(/[^\d]/g, '');
/** "linkedin.com/in/x" → "https://linkedin.com/in/x"; the API takes http(s) URLs only. */
const normalizeUrl = (value: string) => {
  const v = value.trim();
  return !v || /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
};
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

/**
 * The application form (the old ApplyPage's main card). Sends the real
 * multipart request to /api/v1/jobs/{code}/applications; the server's
 * ApplicationFields schema is also run here first, so most problems show
 * next to their field before anything is uploaded.
 */
export function ApplyForm({ job, turnstileSiteKey }: { job: ApplyJob; turnstileSiteKey?: string }) {
  const locale = useLocale();
  const t = useTranslations('apply');
  const tf = useTranslations('jobs.form');
  const tc = useTranslations('common');
  const tj = useTranslations('jobs');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneIso, setPhoneIso] = useState<string>(PHONE_CODES[0].iso);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [residence, setResidence] = useState<string>(RESIDENCE_COUNTRIES[0].value);
  const [residenceOther, setResidenceOther] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [educations, setEducations] = useState<Edu[]>(() => [newEdu()]);
  const [experiences, setExperiences] = useState<Exp[]>(() => [newExp()]);
  const [skills, setSkills] = useState<string[]>([]);
  const [visa, setVisa] = useState<'false' | 'true'>('false');
  const [availableFrom, setAvailableFrom] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [source, setSource] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [agree, setAgree] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);
  // Which pass of the form this is; bumped after a success so the skills picker etc. start over.
  const [round, setRound] = useState(0);

  // Submission state
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [hint, setHint] = useState('');
  const [stoppedAt, setStoppedAt] = useState<'validating' | 'uploading' | 'sending'>('validating');

  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [dialogContainer, setDialogContainer] = useState<HTMLElement | null>(null);
  const cardRef = useCallback((el: HTMLDivElement | null) => setDialogContainer(el?.closest('main') ?? null), []);

  const phoneCode = PHONE_CODES.find((p) => p.iso === phoneIso)?.code ?? PHONE_CODES[0].code;
  const fullPhone = useMemo(() => {
    const n = digitsOf(phoneNumber);
    return n ? `${phoneCode} ${n}` : phoneCode;
  }, [phoneCode, phoneNumber]);

  const countryKeyOf = (value: string) => RESIDENCE_COUNTRIES.find((c) => c.value === value)?.key ?? 'Other';
  const residenceValue = residence === OTHER_COUNTRY ? residenceOther.trim() : residence;
  const countryLabel =
    residence === OTHER_COUNTRY
      ? residenceOther.trim() || t('countries.Other')
      : t(`countries.${countryKeyOf(residence)}`);
  const addressCombined = addressDetail.trim() ? `${countryLabel} — ${addressDetail.trim()}` : countryLabel;

  /** The required fields still empty — the old "submit disabled until…" rule. */
  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!firstName.trim()) missing.push('firstName');
    if (!lastName.trim()) missing.push('lastName');
    if (!email.trim()) missing.push('email');
    if (!digitsOf(phoneNumber)) missing.push('phone');
    if (!residenceValue) missing.push('residenceCountry');
    if (!source.trim()) missing.push('sourceChannel');
    if (!resumeFile) missing.push('resume');
    if (!agree) missing.push('termsAccepted');
    if (turnstileSiteKey && !turnstileToken) missing.push('turnstileToken');
    return missing;
  }, [
    firstName,
    lastName,
    email,
    phoneNumber,
    residenceValue,
    source,
    resumeFile,
    agree,
    turnstileSiteKey,
    turnstileToken,
  ]);
  const ready = missingRequired.length === 0 && !submitting;

  /** Clears one field's message once it is edited. */
  function clearError(...paths: string[]) {
    setErrors((prev) => {
      if (!paths.some((p) => p in prev)) return prev;
      const next = { ...prev };
      for (const p of paths) delete next[p];
      return next;
    });
  }

  // --- Building the request ---------------------------------------------------------

  /** The rows that have anything in them, and which on-screen row each came from. */
  function filledRows() {
    const eduRows = educations
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.level || e.school.trim() || e.from || e.to);
    const expRows = experiences
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.company.trim() || e.title.trim() || e.from || e.to);
    return { eduRows, expRows };
  }

  function textFields(): Record<string, string> {
    const { eduRows, expRows } = filledRows();
    const fields: Record<string, string> = {
      locale,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: fullPhone,
      residenceCountry: residenceValue,
      address: addressDetail.trim(),
      visaRequired: visa,
      availableFrom,
      websiteUrl: normalizeUrl(websiteUrl),
      sourceChannel: source.trim(),
      termsAccepted: agree ? 'true' : 'false',
      educations: JSON.stringify(
        eduRows.map(({ e }) => ({
          level: e.level || null,
          institute: e.school.trim() || null,
          program: null,
          startMonth: e.from || null,
          endMonth: e.to || null,
          gpa: null,
        })),
      ),
      experiences: JSON.stringify(
        expRows.map(({ e }) => ({
          company: e.company.trim() || null,
          role: e.title.trim() || null,
          startMonth: e.from || null,
          endMonth: e.to || null,
        })),
      ),
      skills: JSON.stringify(skills),
    };
    if (turnstileSiteKey) fields.turnstileToken = turnstileToken;
    return fields;
  }

  /** A path as sent (educations.0 = first filled row) → as shown (educations.2 = third row on screen). */
  function toScreenPath(path: string): string {
    const [head, index, ...rest] = path.split('.');
    if ((head === 'educations' || head === 'experiences') && index !== undefined && /^\d+$/.test(index)) {
      const { eduRows, expRows } = filledRows();
      const rows = head === 'educations' ? eduRows : expRows;
      const row = rows[Number(index)]?.i ?? Number(index);
      return [head, String(row), ...rest].join('.');
    }
    return path;
  }

  /** One message per problem, in the page's language (the server's own text when nothing better fits). */
  function messageFor(path: string, serverMessage: string): string {
    const [head, index, leaf] = path.split('.');
    const fields = textFields();
    const empty = (key: string) => !fields[key];
    const fileName = (file: File | undefined) => file?.name ?? '';
    switch (head) {
      case 'firstName':
      case 'lastName':
      case 'sourceChannel':
        return empty(head) ? t('errors.required') : t('errors.tooLong');
      case 'email':
        return empty('email') ? t('errors.required') : t('errors.email');
      case 'phone':
        return digitsOf(phoneNumber) ? t('errors.phone') : t('errors.required');
      case 'residenceCountry':
        return empty('residenceCountry') ? t('errors.required') : t('errors.tooLong');
      case 'address':
        return t('errors.tooLong');
      case 'websiteUrl':
        return t('errors.url');
      case 'availableFrom':
        return t('errors.date');
      case 'termsAccepted':
        return t('errors.terms');
      case 'turnstileToken':
        return t('errors.turnstile');
      case 'educations':
      case 'experiences':
        if (index === undefined) return t('errors.invalid');
        if (!leaf) return t('errors.monthOrder');
        return leaf.endsWith('Month') ? t('errors.invalid') : t('errors.tooLong');
      case 'skills':
        return t('errors.tooLong');
      case 'resume':
        if (/larger than/i.test(serverMessage))
          return t('errors.resumeSize', { name: fileName(resumeFile ?? undefined) });
        if (/not an allowed/i.test(serverMessage))
          return t('errors.resumeType', { name: fileName(resumeFile ?? undefined) });
        return t('errors.resumeRequired');
      case 'attachments': {
        const file = index !== undefined ? attachments[Number(index)] : undefined;
        if (/at most/i.test(serverMessage)) return t('errors.attachmentCount');
        if (/larger than/i.test(serverMessage)) return t('errors.attachmentSize', { name: fileName(file) });
        if (/not an allowed/i.test(serverMessage)) return t('errors.attachmentType', { name: fileName(file) });
        return serverMessage || t('errors.invalid');
      }
      default:
        return serverMessage || t('errors.invalid');
    }
  }

  /** Issues → { screen path: message }, first one per path; attachments.N collapse onto the attachments field. */
  function toErrors(issues: Issue[]): Errors {
    const out: Errors = {};
    for (const issue of issues) {
      const screen = toScreenPath(issue.path);
      const key = screen.startsWith('attachments') ? 'attachments' : screen;
      out[key] ??= messageFor(screen, issue.message);
    }
    return out;
  }

  /** Everything the server would refuse, checked here with its own schema and file rules. */
  function localIssues(): Issue[] {
    const issues: Issue[] = [];
    const parsed = ApplicationFields.safeParse(textFields());
    if (!parsed.success) {
      for (const i of parsed.error.issues) issues.push({ path: i.path.join('.'), message: i.message });
    }
    if (!digitsOf(phoneNumber) && !issues.some((i) => i.path === 'phone')) issues.push({ path: 'phone', message: '' });
    if (!residenceValue) issues.push({ path: 'residenceCountry', message: '' });
    if (!resumeFile) issues.push({ path: 'resume', message: 'a résumé is required' });
    if (attachments.length > MAX_ATTACHMENTS) issues.push({ path: 'attachments', message: 'at most' });
    if (turnstileSiteKey && !turnstileToken) issues.push({ path: 'turnstileToken', message: '' });
    return issues;
  }

  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]');
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  // --- Files ------------------------------------------------------------------------

  async function pickResume(file: File | null) {
    clearError('resume');
    if (!file) {
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
      return;
    }
    const problem = await checkFile(file, 'RESUME');
    if (problem) {
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
      setErrors((prev) => ({
        ...prev,
        resume: t(problem === 'size' ? 'errors.resumeSize' : 'errors.resumeType', { name: file.name }),
      }));
      return;
    }
    setResumeFile(file);
  }

  async function addAttachments(list: FileList | null) {
    const picked = list ? Array.from(list) : [];
    if (attachmentsInputRef.current) attachmentsInputRef.current.value = '';
    if (!picked.length) return;
    clearError('attachments');

    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of picked) {
      const problem = await checkFile(file, 'ATTACHMENT');
      if (problem === 'size') problems.push(t('errors.attachmentSize', { name: file.name }));
      else if (problem === 'type') problems.push(t('errors.attachmentType', { name: file.name }));
      else accepted.push(file);
    }

    const map = new Map<string, File>();
    attachments.forEach((f) => map.set(fileKey(f), f));
    accepted.forEach((f) => map.set(fileKey(f), f));
    const all = Array.from(map.values());
    if (all.length > MAX_ATTACHMENTS) problems.push(t('errors.attachmentCount'));
    setAttachments(all.slice(0, MAX_ATTACHMENTS));
    if (problems.length) setErrors((prev) => ({ ...prev, attachments: problems.join(' ') }));
  }

  // --- Submit -----------------------------------------------------------------------

  function resetForm() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhoneIso(PHONE_CODES[0].iso);
    setPhoneNumber('');
    setResidence(RESIDENCE_COUNTRIES[0].value);
    setResidenceOther('');
    setAddressDetail('');
    setEducations([newEdu()]);
    setExperiences([newExp()]);
    setSkills([]);
    setVisa('false');
    setAvailableFrom('');
    setWebsiteUrl('');
    setSource('');
    setResumeFile(null);
    setAttachments([]);
    setAgree(false);
    setErrors({});
    setRound((r) => r + 1);
    if (resumeInputRef.current) resumeInputRef.current.value = '';
    if (attachmentsInputRef.current) attachmentsInputRef.current.value = '';
  }

  function fail(message: string, at: 'validating' | 'uploading' | 'sending') {
    setStoppedAt(at);
    setResult({ ok: false, message });
    setHint(message);
    setPhase('done');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Not ready (the button looks disabled): say what is missing, next to each field.
    if (missingRequired.length) {
      setErrors(toErrors(localIssues()));
      focusFirstInvalid();
      return;
    }

    setResult(null);
    setSubmitting(true);
    setModalOpen(true);
    setPhase('validating');
    setHint(t('modal.hintValidating'));
    await nextFrame();

    const issues = localIssues();
    if (issues.length) {
      setErrors(toErrors(issues));
      fail(t('errors.fixFields'), 'validating');
      setSubmitting(false);
      return;
    }
    setErrors({});

    setPhase('uploading');
    setHint(t('modal.hintUploading', { percent: 0 }));

    const body = new FormData();
    for (const [key, value] of Object.entries(textFields())) body.set(key, value);
    if (resumeFile) body.append('resume', resumeFile);
    attachments.forEach((f) => body.append('attachments', f));

    let uploaded = false;
    const outcome = await sendApplication(job.code, body, {
      onProgress: (percent) => setHint(t('modal.hintUploading', { percent })),
      onUploaded: () => {
        uploaded = true;
        setPhase('sending');
        setHint(t('modal.hintSending'));
      },
    });

    if (turnstileSiteKey) setTurnstileReset((n) => n + 1);
    const at = uploaded ? 'sending' : 'uploading';

    switch (outcome.kind) {
      case 'created':
        setResult({ ok: true, id: outcome.id });
        setHint(t('modal.hintDone'));
        setPhase('done');
        resetForm();
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        break;
      case 'invalid': {
        const fieldErrors = toErrors(outcome.issues);
        setErrors(fieldErrors);
        // A 400 without field issues (e.g. the verification check) carries its own message.
        fail(
          Object.keys(fieldErrors).length
            ? t('errors.fixFields')
            : /verification/i.test(outcome.message)
              ? t('errors.turnstile')
              : outcome.message || tf('fail'),
          at,
        );
        break;
      }
      case 'rateLimited':
        fail(t('errors.rateLimited', { minutes: Math.max(1, Math.ceil(outcome.retryAfterSeconds / 60)) }), at);
        break;
      case 'notFound':
        fail(t('errors.notFound'), at);
        break;
      case 'unavailable':
        fail(t('errors.unavailable'), at);
        break;
      case 'network':
        fail(t('errors.network'), at);
        break;
      default:
        fail(outcome.message || tf('fail'), at);
    }
    setSubmitting(false);
  }

  // --- Rows -------------------------------------------------------------------------

  const updateEdu = (idx: number, patch: Partial<Edu>) =>
    setEducations((rows) => rows.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const updateExp = (idx: number, patch: Partial<Exp>) =>
    setExperiences((rows) => rows.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  /** Row messages are by position: removing a row drops that collection's messages. */
  const clearRowErrors = (head: 'educations' | 'experiences') =>
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${head}.`))));

  const educationOptions = EDUCATION_LEVELS.map((code) => ({ value: code, label: t(`educationLevels.${code}`) }));
  const err = (path: string) => errors[path];
  const required = t('required');

  return (
    <div ref={cardRef} className={cx(s.glassCard, s.hoverLift, 'rounded-3xl p-5 sm:p-8')}>
      <SubmitDialog
        open={modalOpen}
        phase={phase}
        ok={result?.ok === true}
        hint={hint}
        errorMessage={result && !result.ok ? result.message || tf('fail') : undefined}
        stoppedAt={stoppedAt}
        container={dialogContainer}
        onClose={() => setModalOpen(false)}
        onClosed={focusFirstInvalid}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{tj('applyTitle')}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {job.title}
            {job.location ? ` • ${job.location}` : null}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {t('secureForm')}
          </div>
        </div>
      </div>

      <div className={cx('mt-6', s.softHr)} />

      {result && (
        <div
          role={result.ok ? 'status' : 'alert'}
          className={cx(
            'mt-6 rounded-2xl border px-4 py-3 text-sm',
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800',
          )}
        >
          <div className="flex items-start gap-2">
            {result.ok ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <div className="font-semibold">{result.ok ? tf('success') : t('submitFailed')}</div>
              <div className="mt-1 text-sm break-all">
                {result.ok ? t('reference', { id: result.id }) : result.message || tf('fail')}
              </div>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} noValidate onSubmit={onSubmit} aria-label={tj('applyTitle')}>
        {/* Personal */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2 className="text-sm font-black text-slate-900">{tf('personal')}</h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field
              label={tf('firstName')}
              htmlFor="apply-firstName"
              required
              requiredLabel={required}
              error={err('firstName')}
            >
              <input
                id="apply-firstName"
                className={inputClass()}
                value={firstName}
                autoComplete="given-name"
                maxLength={100}
                aria-required
                {...invalidProps('apply-firstName', err('firstName'))}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError('firstName');
                }}
              />
            </Field>

            <Field
              label={tf('lastName')}
              htmlFor="apply-lastName"
              required
              requiredLabel={required}
              error={err('lastName')}
            >
              <input
                id="apply-lastName"
                className={inputClass()}
                value={lastName}
                autoComplete="family-name"
                maxLength={100}
                aria-required
                {...invalidProps('apply-lastName', err('lastName'))}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError('lastName');
                }}
              />
            </Field>

            <Field label={tf('email')} htmlFor="apply-email" required requiredLabel={required} error={err('email')}>
              <input
                id="apply-email"
                type="email"
                className={inputClass()}
                value={email}
                autoComplete="email"
                maxLength={200}
                aria-required
                {...invalidProps('apply-email', err('email'))}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError('email');
                }}
              />
            </Field>

            <Field
              label={tf('phone')}
              htmlFor="apply-phone"
              hint={`${tf('phonePreview')}: ${fullPhone}`}
              required
              requiredLabel={required}
              error={err('phone')}
            >
              <div className="grid grid-cols-[150px_1fr] gap-2">
                <ApplySelect
                  aria-label={tf('phoneCode')}
                  value={phoneIso}
                  onValueChange={setPhoneIso}
                  options={PHONE_CODES.map((p) => ({ value: p.iso, label: t(`phoneCodes.${p.iso}`) }))}
                />
                <input
                  id="apply-phone"
                  type="tel"
                  className={inputClass()}
                  value={phoneNumber}
                  autoComplete="tel-national"
                  maxLength={30}
                  aria-required
                  {...invalidProps('apply-phone', err('phone'))}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    clearError('phone');
                  }}
                  placeholder={tf('phoneNumber')}
                  inputMode="numeric"
                />
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field
                label={tf('currentAddressCountry')}
                htmlFor="apply-residenceCountry"
                hint={`${tf('addressSavedAs')}: ${addressCombined}`}
                required
                requiredLabel={required}
                error={err('residenceCountry')}
              >
                <div className="grid gap-2 md:grid-cols-2">
                  <ApplySelect
                    id="apply-residenceCountry"
                    aria-required
                    {...(residence !== OTHER_COUNTRY
                      ? invalidProps('apply-residenceCountry', err('residenceCountry'))
                      : {})}
                    value={residence}
                    onValueChange={(v) => {
                      setResidence(v);
                      clearError('residenceCountry');
                    }}
                    options={RESIDENCE_COUNTRIES.map((c) => ({ value: c.value, label: t(`countries.${c.key}`) }))}
                  />

                  <input
                    id="apply-address"
                    className={inputClass()}
                    value={addressDetail}
                    maxLength={500}
                    autoComplete="street-address"
                    aria-label={tf('addressDetail')}
                    {...invalidProps('apply-address', err('address'))}
                    onChange={(e) => {
                      setAddressDetail(e.target.value);
                      clearError('address');
                    }}
                    placeholder={tf('addressDetailPlaceholder')}
                  />
                </div>

                {residence === OTHER_COUNTRY && (
                  <div className="mt-2">
                    <input
                      id="apply-residenceCountry-other"
                      className={inputClass()}
                      value={residenceOther}
                      maxLength={100}
                      aria-label={t('otherCountryLabel')}
                      aria-required
                      {...invalidProps('apply-residenceCountry', err('residenceCountry'))}
                      onChange={(e) => {
                        setResidenceOther(e.target.value);
                        clearError('residenceCountry');
                      }}
                      placeholder={t('otherCountryPlaceholder')}
                    />
                  </div>
                )}
                <FieldError id="apply-address" error={err('address')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Education */}
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-700" aria-hidden="true" />
              <h2 className="text-sm font-black text-slate-900">{tf('education')}</h2>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEducations((p) => (p.length >= MAX_EDUCATIONS ? p : [...p, newEdu()]))}
            >
              + {tf('addEducation')}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {educations.map((e, idx) => {
              const id = `apply-educations-${idx}`;
              return (
                <div key={e.key} className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
                  <div className="grid gap-4">
                    <Field label={tf('educationLevel')} htmlFor={`${id}-level`} error={err(`educations.${idx}.level`)}>
                      <ApplySelect
                        id={`${id}-level`}
                        clearable
                        placeholder={tf('educationSelectLevel')}
                        value={e.level}
                        {...invalidProps(`${id}-level`, err(`educations.${idx}.level`))}
                        onValueChange={(v) => {
                          updateEdu(idx, { level: v });
                          clearError(`educations.${idx}.level`);
                        }}
                        options={educationOptions}
                      />
                    </Field>

                    <Field
                      label={tf('educationSchool')}
                      htmlFor={`${id}-institute`}
                      error={err(`educations.${idx}.institute`)}
                    >
                      <input
                        id={`${id}-institute`}
                        className={inputClass()}
                        value={e.school}
                        maxLength={200}
                        {...invalidProps(`${id}-institute`, err(`educations.${idx}.institute`))}
                        onChange={(ev) => {
                          updateEdu(idx, { school: ev.target.value });
                          clearError(`educations.${idx}.institute`);
                        }}
                      />
                    </Field>

                    <MonthRange
                      idPrefix={id}
                      fromLabel={tf('educationFrom')}
                      toLabel={tf('educationTo')}
                      from={e.from}
                      to={e.to}
                      fromError={err(`educations.${idx}.startMonth`)}
                      toError={err(`educations.${idx}.endMonth`) ?? err(`educations.${idx}`)}
                      onChange={({ from, to }) => {
                        updateEdu(idx, { from, to });
                        clearError(`educations.${idx}`, `educations.${idx}.startMonth`, `educations.${idx}.endMonth`);
                      }}
                    />
                  </div>

                  {educations.length > 1 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setEducations((p) => p.filter((_, i) => i !== idx));
                          clearRowErrors('educations');
                        }}
                      >
                        {tc('remove')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Experience */}
        <div className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-900">{tf('experience')}</h2>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setExperiences((p) => (p.length >= MAX_EXPERIENCES ? p : [...p, newExp()]))}
            >
              + {tf('addExperience')}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {experiences.map((e, idx) => {
              const id = `apply-experiences-${idx}`;
              return (
                <div key={e.key} className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={tf('experienceCompany')}
                      htmlFor={`${id}-company`}
                      error={err(`experiences.${idx}.company`)}
                    >
                      <input
                        id={`${id}-company`}
                        className={inputClass()}
                        value={e.company}
                        maxLength={200}
                        autoComplete="organization"
                        {...invalidProps(`${id}-company`, err(`experiences.${idx}.company`))}
                        onChange={(ev) => {
                          updateExp(idx, { company: ev.target.value });
                          clearError(`experiences.${idx}.company`);
                        }}
                      />
                    </Field>

                    <Field label={tf('experienceTitle')} htmlFor={`${id}-role`} error={err(`experiences.${idx}.role`)}>
                      <input
                        id={`${id}-role`}
                        className={inputClass()}
                        value={e.title}
                        maxLength={200}
                        autoComplete="organization-title"
                        {...invalidProps(`${id}-role`, err(`experiences.${idx}.role`))}
                        onChange={(ev) => {
                          updateExp(idx, { title: ev.target.value });
                          clearError(`experiences.${idx}.role`);
                        }}
                      />
                    </Field>

                    <div className="md:col-span-2">
                      <MonthRange
                        idPrefix={id}
                        fromLabel={tf('experienceFrom')}
                        toLabel={tf('experienceTo')}
                        from={e.from}
                        to={e.to}
                        fromError={err(`experiences.${idx}.startMonth`)}
                        toError={err(`experiences.${idx}.endMonth`) ?? err(`experiences.${idx}`)}
                        onChange={({ from, to }) => {
                          updateExp(idx, { from, to });
                          clearError(
                            `experiences.${idx}`,
                            `experiences.${idx}.startMonth`,
                            `experiences.${idx}.endMonth`,
                          );
                        }}
                      />
                    </div>
                  </div>

                  {experiences.length > 1 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setExperiences((p) => p.filter((_, i) => i !== idx));
                          clearRowErrors('experiences');
                        }}
                      >
                        {tc('remove')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Skills */}
        <SkillsPicker
          key={round}
          skills={skills}
          onChange={(next) => {
            setSkills(next);
            clearError('skills');
          }}
          error={err('skills')}
        />

        {/* Other */}
        <div className="mt-10">
          <h2 className="text-sm font-black text-slate-900">{tf('other')}</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label={tf('visa')} htmlFor="apply-visaRequired" required requiredLabel={required}>
              <ApplySelect
                id="apply-visaRequired"
                value={visa}
                onValueChange={(v) => setVisa(v === 'true' ? 'true' : 'false')}
                options={[
                  { value: 'false', label: t('visaNo') },
                  { value: 'true', label: t('visaYes') },
                ]}
              />
            </Field>

            <Field label={tf('availableStartDate')} htmlFor="apply-availableFrom" error={err('availableFrom')}>
              <input
                id="apply-availableFrom"
                type="date"
                className={inputClass()}
                value={availableFrom}
                {...invalidProps('apply-availableFrom', err('availableFrom'))}
                onChange={(e) => {
                  setAvailableFrom(e.target.value);
                  clearError('availableFrom');
                }}
              />
            </Field>

            <Field label={tf('url')} htmlFor="apply-websiteUrl" error={err('websiteUrl')}>
              <input
                id="apply-websiteUrl"
                type="url"
                inputMode="url"
                autoComplete="url"
                className={inputClass()}
                value={websiteUrl}
                maxLength={500}
                {...invalidProps('apply-websiteUrl', err('websiteUrl'))}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  clearError('websiteUrl');
                }}
              />
            </Field>

            <Field
              label={tf('source')}
              htmlFor="apply-sourceChannel"
              required
              requiredLabel={required}
              error={err('sourceChannel')}
            >
              <input
                id="apply-sourceChannel"
                className={inputClass()}
                value={source}
                maxLength={100}
                aria-required
                {...invalidProps('apply-sourceChannel', err('sourceChannel'))}
                onChange={(e) => {
                  setSource(e.target.value);
                  clearError('sourceChannel');
                }}
              />
            </Field>
          </div>
        </div>

        {/* Files */}
        <div className="mt-10">
          <label htmlFor="apply-resume" className="block text-sm font-black text-slate-900">
            {tf('resume')}{' '}
            <span className="text-rose-600">
              <span aria-hidden="true">*</span>
              <span className="sr-only">({required})</span>
            </span>
          </label>

          <div className="mt-3">
            <input
              id="apply-resume"
              ref={resumeInputRef}
              type="file"
              className={s.fileInput}
              accept={acceptOf('RESUME')}
              aria-required
              {...invalidProps('apply-resume', err('resume'))}
              onChange={(e) => void pickResume(e.target.files?.[0] ?? null)}
            />
          </div>
          {err('resume') ? (
            <div className="mt-2">
              <FieldError id="apply-resume" error={err('resume')} />
            </div>
          ) : null}

          {resumeFile && (
            <div className={cx('mt-3', s.fileRow)}>
              <div className={s.fileMeta}>
                <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <div className="min-w-0">
                  <div className={s.fileName}>{resumeFile.name}</div>
                  <div className={s.fileSize}>{t('files.size', { size: Math.round(resumeFile.size / 1024) })}</div>
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => void pickResume(null)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> {tc('remove')}
              </button>
            </div>
          )}

          <div className="mt-6">
            <label htmlFor="apply-attachments" className="block text-sm font-black text-slate-900">
              {tf('attachments')}
            </label>

            <div className="mt-3">
              <input
                id="apply-attachments"
                ref={attachmentsInputRef}
                type="file"
                className={s.fileInput}
                multiple
                accept={acceptOf('ATTACHMENT')}
                {...invalidProps('apply-attachments', err('attachments'))}
                onChange={(e) => void addAttachments(e.target.files)}
              />
            </div>
            {err('attachments') ? (
              <div className="mt-2">
                <FieldError id="apply-attachments" error={err('attachments')} />
              </div>
            ) : null}

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((f) => {
                  const k = fileKey(f);
                  return (
                    <div key={k} className={s.fileRow}>
                      <div className={s.fileMeta}>
                        <Paperclip className="h-4 w-4 text-slate-500" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className={s.fileName}>{f.name}</div>
                          <div className={s.fileSize}>{t('files.size', { size: Math.round(f.size / 1024) })}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          setAttachments((prev) => prev.filter((x) => fileKey(x) !== k));
                          clearError('attachments');
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> {tc('remove')}
                      </button>
                    </div>
                  );
                })}
                <div className="text-[11px] text-slate-500">
                  {t('files.totals', {
                    count: attachments.length,
                    size: Math.round(attachments.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024),
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Terms */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <div className="flex items-start gap-3">
            <input
              id="apply-termsAccepted"
              type="checkbox"
              checked={agree}
              aria-required
              {...invalidProps('apply-termsAccepted', err('termsAccepted'))}
              onChange={(e) => {
                setAgree(e.target.checked);
                clearError('termsAccepted');
              }}
              className="mt-1"
            />
            <div className="space-y-1">
              <label htmlFor="apply-termsAccepted" className="block text-sm text-slate-700">
                {tf('agree')}
              </label>
              <FieldError id="apply-termsAccepted" error={err('termsAccepted')} />
            </div>
          </div>
        </div>

        {turnstileSiteKey ? (
          <div>
            <Turnstile
              siteKey={turnstileSiteKey}
              language={locale === 'zh' ? 'zh-cn' : locale}
              resetKey={turnstileReset}
              onToken={(token) => {
                setTurnstileToken(token);
                if (token) clearError('turnstileToken');
              }}
            />
            {err('turnstileToken') ? (
              <div id="apply-turnstileToken" tabIndex={-1} data-invalid="true" className="mt-2 outline-none">
                <FieldError id="apply-turnstileToken-msg" error={err('turnstileToken')} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          <button
            type="submit"
            aria-disabled={!ready}
            disabled={submitting}
            className={cx(
              'btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50',
              !ready && 'cursor-not-allowed! opacity-50',
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? tf('submitting') : tf('submit')}
          </button>

          <div className="mt-3 text-[11px] text-slate-500">{t('submitNote')}</div>
        </div>
      </form>
    </div>
  );
}
