'use client';

import {
  AlignLeft,
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Building2,
  CheckCircle2,
  Globe2,
  Hash,
  Layers3,
  Loader2,
  MapPin,
  Save,
  Trash2,
  Type,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { adminFetch, AdminApiError } from '@/lib/admin/client';
import { useUnsavedChanges } from '@/lib/admin/unsaved';
import type { JobPublishState } from '@/lib/constants-types';
import { countryName, flagOf } from '@/lib/countries';
import type { AdminLocale } from '@/lib/i18n/admin';
import { cn } from '@/lib/utils';
import { DeleteJobDialog } from './delete-job-dialog';
import { DEFAULT_COUNTRIES, JOB_CODE_PATTERN, JOB_LANGS, jobTitle, PUBLISH_STATES, type JobLang } from './job-utils';
import { ValueCombobox } from './value-combobox';
import { useAbilities } from '@/components/admin/shell/abilities';
import { GuardedLink } from '@/components/admin/shell/unsaved-guard';

/** A job as the editor receives it (the AdminJob fields it edits). */
export interface EditableJob {
  id: string;
  code: string;
  publishState: JobPublishState;
  countryCode: string;
  department: string | null;
  level: string | null;
  quantity: number | null;
  applicantCount: number;
  translations: Partial<
    Record<
      JobLang,
      { title: string; location: string | null; description: string | null; qualifications: string | null }
    >
  >;
}

export interface JobOptions {
  countryCodes: string[];
  departments: string[];
  levels: string[];
}

type LangText = { title: string; location: string; description: string; qualifications: string };

interface FormState {
  code: string;
  publishState: JobPublishState;
  countryCode: string;
  department: string;
  level: string;
  quantity: string;
  translations: Record<JobLang, LangText>;
}

/** Field errors, keyed by the API's issue paths: code, quantity, translations.en.title … */
type Errors = Record<string, string>;

const EMPTY_TEXT: LangText = { title: '', location: '', description: '', qualifications: '' };

function toForm(job: Omit<EditableJob, 'id' | 'applicantCount'> | null): FormState {
  const text = (lang: JobLang): LangText => {
    const t = job?.translations[lang];
    return t
      ? {
          title: t.title,
          location: t.location ?? '',
          description: t.description ?? '',
          qualifications: t.qualifications ?? '',
        }
      : EMPTY_TEXT;
  };
  return {
    code: job?.code ?? '',
    publishState: job?.publishState ?? 'DRAFT',
    countryCode: job?.countryCode ?? 'TH',
    department: job?.department ?? '',
    level: job?.level ?? '',
    quantity: job ? (job.quantity === null ? '' : String(job.quantity)) : '1',
    translations: { th: text('th'), en: text('en'), zh: text('zh') },
  };
}

/** The JobInput body (lib/api/schemas.ts). A language without a title is left out. */
function toBody(form: FormState) {
  const orNull = (value: string) => value.trim() || null;
  return {
    code: form.code.trim(),
    publishState: form.publishState,
    countryCode: form.countryCode,
    department: orNull(form.department),
    level: orNull(form.level),
    quantity: form.quantity.trim() === '' ? null : Number(form.quantity),
    translations: Object.fromEntries(
      JOB_LANGS.filter((lang) => form.translations[lang].title.trim()).map((lang) => {
        const t = form.translations[lang];
        return [
          lang,
          {
            title: t.title.trim(),
            location: orNull(t.location),
            description: orNull(t.description),
            qualifications: orNull(t.qualifications),
          },
        ];
      }),
    ),
  };
}

const STATE_STYLE: Record<JobPublishState, { on: string; dot: string }> = {
  DRAFT: { on: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  PUBLISHED: { on: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  CLOSED: { on: 'border-gray-300 bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const FIELD =
  'h-auto rounded-xl border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:ring-0 aria-invalid:border-red-400 aria-invalid:ring-0';

function Labeled({
  icon,
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
        <span className="shrink-0">{label}</span>
        {hint && <span className="min-w-0 text-xs font-normal text-gray-400">· {hint}</span>}
      </label>
      {children}
      {error && (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Create or edit a job — ported from the old admin's JobEditPage, same layout:
 * the basic info and the three-language text on the left, the sticky
 * "publishing" panel on the right. Saves through the API (POST / PUT
 * /api/v1/admin/jobs), shows the server's field issues next to the fields,
 * and asks before unsaved changes are thrown away.
 */
export function JobEditor({ job, options }: { job: EditableJob | null; options: JobOptions }) {
  const t = useTranslations('jobs.editor');
  const publishState = useTranslations('publishState');
  const common = useTranslations('common');
  const tDelete = useTranslations('jobs.delete');
  const locale = useLocale() as AdminLocale;
  const router = useRouter();
  const isEdit = !!job;
  const can = useAbilities();
  // View-only access: the same editor, every field disabled, no save.
  const readOnly = !can.jobs.edit;

  const [initial, setInitial] = useState(() => toForm(job));
  const [form, setForm] = useState(initial);
  const [lang, setLang] = useState<JobLang>('th');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  // As the jobs list names it: the admin's language first.
  const title = job ? jobTitle(job, locale) : '';

  // Leaving with unsaved changes — closing the tab, Back, the sidebar, "back" / "cancel" here — asks first.
  useUnsavedChanges(dirty);

  const countries = useMemo(() => {
    const codes = [...new Set([...DEFAULT_COUNTRIES, ...options.countryCodes, form.countryCode])];
    const collator = new Intl.Collator(locale);
    return codes
      .map((code) => ({ code, name: countryName(code, locale) }))
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [options.countryCodes, form.countryCode, locale]);

  const clearError = (...paths: string[]) =>
    setErrors((current) => {
      if (!paths.some((p) => p in current)) return current;
      const next = { ...current };
      for (const p of paths) delete next[p];
      return next;
    });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key);
  };

  const setText = (l: JobLang, field: keyof LangText, value: string) => {
    setForm((f) => ({
      ...f,
      translations: { ...f.translations, [l]: { ...f.translations[l], [field]: value } },
    }));
    clearError(`translations.${l}.${field}`, ...(field === 'title' ? ['translations'] : []));
  };

  /** The server's rules, checked first so most mistakes never leave the browser. */
  const validate = (): Errors => {
    const found: Errors = {};
    const code = form.code.trim();
    if (!code) found.code = t('errors.codeRequired');
    else if (!JOB_CODE_PATTERN.test(code)) found.code = t('errors.codePattern');
    const quantity = form.quantity.trim();
    if (quantity !== '') {
      const n = Number(quantity);
      if (!Number.isInteger(n) || n < 0 || n > 10_000) found.quantity = t('errors.openings');
    }
    for (const l of JOB_LANGS) {
      const text = form.translations[l];
      if (!text.title.trim() && (text.location.trim() || text.description.trim() || text.qualifications.trim())) {
        found[`translations.${l}.title`] = t('errors.titleMissing');
      }
    }
    if (!JOB_LANGS.some((l) => form.translations[l].title.trim())) found.translations = t('errors.titleRequired');
    return found;
  };

  /** Shows errors, and opens the language tab that has one when the current tab has none. */
  const showErrors = (found: Errors) => {
    setErrors(found);
    const langWithError = JOB_LANGS.find((l) => Object.keys(found).some((p) => p.startsWith(`translations.${l}.`)));
    const currentHasError = Object.keys(found).some((p) => p.startsWith(`translations.${lang}.`));
    if (langWithError && !currentHasError) setLang(langWithError);
  };

  const save = async () => {
    setFormError(null);
    const found = validate();
    if (Object.keys(found).length) {
      showErrors(found);
      setFormError(found.translations && Object.keys(found).length === 1 ? found.translations : t('errors.fixFields'));
      return;
    }
    setErrors({});
    setSaving(true);
    const body = toBody(form);
    try {
      const { job: saved } = await adminFetch<{ job: EditableJob }>(isEdit ? `/jobs/${job.id}` : '/jobs', {
        method: isEdit ? 'PUT' : 'POST',
        json: body,
      });
      const next = toForm(saved);
      setInitial(next);
      setForm(next);
      if (isEdit) {
        toast.success(t('saved', { code: saved.code }));
        router.refresh();
      } else {
        toast.success(t('created', { code: saved.code }));
        router.push(`/admin/jobs/${saved.id}`);
      }
    } catch (error) {
      const found: Errors = {};
      let message = t('saveFailed');
      if (error instanceof AdminApiError) {
        if (error.status === 409) found.code = t('errors.codeTaken');
        for (const issue of error.issues) found[issue.path] ??= issue.message;
        message = Object.keys(found).length ? t('errors.fixFields') : error.message || message;
      }
      showErrors(found);
      setFormError(message);
      toast.error(t('saveFailed'), { description: message });
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (path: string) => errors[path];
  const issueFor = (l: JobLang) => Object.keys(errors).some((p) => p.startsWith(`translations.${l}.`));
  // Server issues on paths this form has no field for (e.g. publishState) go in the box.
  const known = new Set(['code', 'quantity', 'department', 'level', 'countryCode', 'translations']);
  const otherIssues = Object.entries(errors).filter(([p]) => !known.has(p) && !p.startsWith('translations.'));
  // "Fix the fields in red" goes away with the last red field; a server message stays until the next save.
  const fieldSummary = [t('errors.fixFields'), t('errors.titleRequired')];
  const shownError =
    formError && (!fieldSummary.includes(formError) || Object.keys(errors).length > 0) ? formError : null;

  return (
    <div>
      <GuardedLink
        href="/admin/jobs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> {t('back')}
      </GuardedLink>

      <PageHeader
        icon={<Briefcase className="h-5 w-5" />}
        title={isEdit ? t('titleEdit') : t('titleNew')}
        subtitle={
          isEdit ? (
            <>
              {title !== job.code && <>{title} · </>}
              <span className="font-mono">{job.code}</span>
            </>
          ) : (
            t('subtitleNew')
          )
        }
        actions={
          isEdit &&
          can.jobs.manage && (
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(true)}
              disabled={saving}
              className="h-auto rounded-xl border-gray-200 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> {tDelete('action')}
            </Button>
          )
        }
      />

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <fieldset disabled={readOnly} className="contents">
          <div className="min-w-0 space-y-6">
            {/* Basic info */}
            <section className="card p-6">
              <h2 className="mb-5 text-sm font-bold text-gray-900">{t('basic')}</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Labeled
                  icon={<Hash className="h-4 w-4" />}
                  label={t('code')}
                  hint={isEdit ? t('codeLocked') : t('codeHint')}
                  htmlFor="job-code"
                  error={fieldError('code')}
                >
                  <Input
                    id="job-code"
                    value={form.code}
                    disabled={isEdit}
                    required
                    maxLength={64}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="SHD-TH-HRBP"
                    aria-invalid={!!fieldError('code') || undefined}
                    aria-describedby={fieldError('code') ? 'job-code-error' : undefined}
                    onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    className={cn(FIELD, 'font-mono disabled:bg-gray-100 disabled:opacity-100')}
                  />
                </Labeled>
                <Labeled
                  icon={<Users className="h-4 w-4" />}
                  label={t('openings')}
                  hint={t('openingsHint')}
                  htmlFor="job-quantity"
                  error={fieldError('quantity')}
                >
                  <Input
                    id="job-quantity"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10_000}
                    step={1}
                    value={form.quantity}
                    aria-invalid={!!fieldError('quantity') || undefined}
                    onChange={(e) => set('quantity', e.target.value)}
                    className={FIELD}
                  />
                </Labeled>
                <Labeled
                  icon={<Building2 className="h-4 w-4" />}
                  label={t('department')}
                  htmlFor="job-department"
                  error={fieldError('department')}
                >
                  <ValueCombobox
                    id="job-department"
                    value={form.department}
                    onChange={(v) => set('department', v)}
                    options={options.departments}
                    placeholder={t('departmentPlaceholder')}
                    invalid={!!fieldError('department')}
                  />
                </Labeled>
                <Labeled
                  icon={<Layers3 className="h-4 w-4" />}
                  label={t('level')}
                  htmlFor="job-level"
                  error={fieldError('level')}
                >
                  <ValueCombobox
                    id="job-level"
                    value={form.level}
                    onChange={(v) => set('level', v)}
                    options={options.levels}
                    placeholder={t('levelPlaceholder')}
                    invalid={!!fieldError('level')}
                  />
                </Labeled>
                <Labeled
                  icon={<Globe2 className="h-4 w-4" />}
                  label={t('country')}
                  htmlFor="job-country"
                  error={fieldError('countryCode')}
                >
                  <Select value={form.countryCode} onValueChange={(v) => set('countryCode', v)}>
                    <SelectTrigger
                      id="job-country"
                      aria-invalid={!!fieldError('countryCode') || undefined}
                      className="h-auto! w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm focus-visible:border-blue-600 focus-visible:ring-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-72">
                      {countries.map(({ code, name }) => (
                        <SelectItem key={code} value={code}>
                          <span aria-hidden>{flagOf(code)}</span>
                          {name}
                          <span className="font-mono text-xs text-gray-400">{code}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Labeled>
              </div>
            </section>

            {/* The text, per language */}
            <section className="card p-6">
              <Tabs value={lang} onValueChange={(v) => setLang(v as JobLang)} className="gap-0">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-gray-900">{t('content')}</h2>
                  <TabsList className="h-auto! gap-1 rounded-xl bg-gray-100 p-1">
                    {JOB_LANGS.map((l) => {
                      const filled = !!form.translations[l].title.trim();
                      return (
                        <TabsTrigger
                          key={l}
                          value={l}
                          className={cn(
                            'h-auto flex-none gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700',
                            'data-active:bg-white data-active:text-blue-700 data-active:shadow-xs',
                            issueFor(l) && 'text-red-600 data-active:text-red-600',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              issueFor(l) ? 'bg-red-500' : filled ? 'bg-emerald-500' : 'bg-gray-300',
                            )}
                          />
                          {t(`languages.${l}`)}
                          <span className="sr-only">({filled ? t('hasTitle') : t('noTitle')})</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {JOB_LANGS.map((l) => (
                  <TabsContent key={l} value={l} className="space-y-5">
                    <Labeled
                      icon={<Type className="h-4 w-4" />}
                      label={t('jobTitle', { lang: l.toUpperCase() })}
                      htmlFor={`job-title-${l}`}
                      error={fieldError(`translations.${l}.title`) ?? fieldError('translations')}
                    >
                      <Input
                        id={`job-title-${l}`}
                        value={form.translations[l].title}
                        maxLength={200}
                        placeholder={t('jobTitlePlaceholder')}
                        aria-invalid={
                          !!(fieldError(`translations.${l}.title`) ?? fieldError('translations')) || undefined
                        }
                        onChange={(e) => setText(l, 'title', e.target.value)}
                        className={FIELD}
                      />
                    </Labeled>
                    <Labeled
                      icon={<MapPin className="h-4 w-4" />}
                      label={t('location', { lang: l.toUpperCase() })}
                      htmlFor={`job-location-${l}`}
                      error={fieldError(`translations.${l}.location`)}
                    >
                      <Input
                        id={`job-location-${l}`}
                        value={form.translations[l].location}
                        maxLength={200}
                        placeholder={t('locationPlaceholder')}
                        onChange={(e) => setText(l, 'location', e.target.value)}
                        className={FIELD}
                      />
                    </Labeled>
                    <Labeled
                      icon={<AlignLeft className="h-4 w-4" />}
                      label={t('description', { lang: l.toUpperCase() })}
                      htmlFor={`job-description-${l}`}
                      error={fieldError(`translations.${l}.description`)}
                    >
                      <Textarea
                        id={`job-description-${l}`}
                        value={form.translations[l].description}
                        onChange={(e) => setText(l, 'description', e.target.value)}
                        className={cn(FIELD, 'min-h-40 resize-y leading-relaxed')}
                      />
                    </Labeled>
                    <Labeled
                      icon={<BadgeCheck className="h-4 w-4" />}
                      label={t('qualifications', { lang: l.toUpperCase() })}
                      htmlFor={`job-qualifications-${l}`}
                      error={fieldError(`translations.${l}.qualifications`)}
                    >
                      <Textarea
                        id={`job-qualifications-${l}`}
                        value={form.translations[l].qualifications}
                        onChange={(e) => setText(l, 'qualifications', e.target.value)}
                        className={cn(FIELD, 'min-h-32 resize-y leading-relaxed')}
                      />
                    </Labeled>
                  </TabsContent>
                ))}
              </Tabs>

              <p className="mt-4 text-xs text-gray-500">{t('fallbackHint')}</p>
            </section>
          </div>

          {/* The publishing panel (sticky) */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="card p-6">
              <h2 id="job-state-label" className="mb-3 text-sm font-bold text-gray-900">
                {t('publishing')}
              </h2>

              <RadioGroup
                aria-labelledby="job-state-label"
                value={form.publishState}
                onValueChange={(v) => set('publishState', v as JobPublishState)}
                className="gap-2"
              >
                {PUBLISH_STATES.map((s) => {
                  const active = form.publishState === s;
                  return (
                    <RadioGroupPrimitive.Item
                      key={s}
                      value={s}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition outline-none focus-visible:ring-3 focus-visible:ring-blue-600/20',
                        active ? STATE_STYLE[s].on : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', active ? STATE_STYLE[s].dot : 'bg-gray-300')} />
                      {publishState(s)}
                      <RadioGroupPrimitive.Indicator className="ml-auto">
                        <CheckCircle2 className="h-4 w-4" />
                      </RadioGroupPrimitive.Indicator>
                    </RadioGroupPrimitive.Item>
                  );
                })}
              </RadioGroup>

              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500">
                {t(`stateHelp.${form.publishState}`)}
              </div>

              {(shownError || otherIssues.length > 0) && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200/60 ring-inset"
                >
                  {shownError}
                  {otherIssues.map(([path, message]) => (
                    <div key={path} className="mt-1 text-xs">
                      <span className="font-mono">{path}</span>: {message}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-2">
                {!readOnly && (
                  <Button
                    type="submit"
                    disabled={saving}
                    className="h-auto w-full rounded-xl px-4 py-2 font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? (isEdit ? common('saving') : t('creating')) : isEdit ? t('saveChanges') : t('create')}
                  </Button>
                )}
                <Button
                  asChild
                  variant="outline"
                  className="h-auto w-full rounded-xl border-gray-200 bg-white px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50"
                >
                  <GuardedLink href="/admin/jobs">{common('cancel')}</GuardedLink>
                </Button>
                {dirty && (
                  <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {t('unsaved')}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </fieldset>
      </form>

      {isEdit && (
        <DeleteJobDialog
          job={{ id: job.id, code: job.code, title, applicantCount: job.applicantCount }}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => {
            setInitial(form);
            router.push('/admin/jobs');
          }}
        />
      )}
    </div>
  );
}
