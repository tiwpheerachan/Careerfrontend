'use client';

import { ImageUp, Trash2, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type DragEvent } from 'react';
import { ApplySelect } from '@/components/apply/apply-select';
import { Field, FieldError } from '@/components/apply/field';
import { MonthYearPicker } from '@/components/apply/month-year-picker';
import {
  APPLICATION_FORM_LETTERHEADS,
  BLOOD_TYPES,
  FORM_EDUCATION_LEVELS,
  FORM_LANGUAGES,
  GENDERS,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  NAME_TITLES,
  SKILL_LEVELS,
} from '@/lib/constants';
import { cx } from '@/lib/cx';
import { Choices, Group, NumberField, TextField, Tick, read, useForm } from './controls';
import { fieldId, OTHER_JOB } from './draft';

/**
 * The wizard's steps, in the paper form's order (its numbers in comments).
 * Only what makes the form useful is required; the rest may be skipped.
 */

export interface JobOption {
  code: string;
  title: string;
  countryCode: string;
}

/**
 * The jobs offered under a letterhead. Every company letterhead (SHD, Rabbit,
 * TOP ONE) is a Thai company, so it lists only the jobs in Thailand; with no
 * company chosen (or "not specified") every job is offered.
 */
export function jobsFor(jobs: JobOption[], letterhead: string): JobOption[] {
  return letterhead && letterhead !== 'PLAIN' ? jobs.filter((job) => job.countryCode === 'TH') : jobs;
}

function useT() {
  return useTranslations('applicationForm.fields');
}

/** 1. The company and the position. */
export function PositionStep({ jobs }: { jobs: JobOption[] }) {
  const t = useT();
  const { draft, set, errors } = useForm();
  const te = useTranslations('applicationForm.errors');
  const tr = useTranslations('apply');
  const jobId = fieldId('positionOther');
  return (
    <div className="space-y-6">
      <Choices
        path="letterhead"
        label={t('letterhead')}
        required
        grid
        options={APPLICATION_FORM_LETTERHEADS.map((value) => ({
          value,
          label: t(`letterheads.${value}`),
          note: t(`letterheadNotes.${value}`),
        }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('job')}
          htmlFor={fieldId('jobCode')}
          required
          requiredLabel={tr('required')}
          error={draft.jobCode !== OTHER_JOB && errors.positionOther ? te(errors.positionOther) : undefined}
          errorFor={draft.jobCode !== OTHER_JOB ? jobId : undefined}
        >
          <ApplySelect
            id={fieldId('jobCode')}
            value={draft.jobCode}
            onValueChange={(value) => set('jobCode', value)}
            placeholder={t('jobPlaceholder')}
            options={[
              ...jobsFor(jobs, draft.letterhead).map((job) => ({ value: job.code, label: job.title })),
              { value: OTHER_JOB, label: t('jobOther') },
            ]}
            aria-required
          />
        </Field>
        {draft.jobCode === OTHER_JOB ? (
          <TextField path="positionOther" label={t('positionOther')} required />
        ) : (
          <div className="hidden sm:block" />
        )}
        <TextField
          path="expectedSalaryMin"
          label={t('expectedSalaryMin')}
          placeholder={t('expectedSalaryMinPlaceholder')}
          inputMode="numeric"
          maxLength={8}
          allow="digits"
        />
        <TextField
          path="expectedSalaryMax"
          label={t('expectedSalaryMax')}
          placeholder={t('expectedSalaryMaxPlaceholder')}
          inputMode="numeric"
          maxLength={8}
          allow="digits"
        />
      </div>
    </div>
  );
}

/** 2. Name, 4. birth date and nationality — and, behind its consent, 4's sensitive fields. */
export function PersonalStep() {
  const t = useT();
  const { draft } = useForm();
  return (
    <div className="space-y-6">
      <PhotoField />
      <Group title={t('personalInfo')}>
        <Choices
          path="nameTitle"
          label={t('nameTitle')}
          options={NAME_TITLES.map((value) => ({ value, label: t(`nameTitles.${value}`) }))}
          className="sm:col-span-2"
        />
        <TextField
          path="nameTh"
          label={t('nameTh')}
          placeholder={t('nameThPlaceholder')}
          required
          autoComplete="name"
          className="sm:col-span-2"
        />
        <TextField path="nameEn" label={t('nameEn')} autoComplete="name" className="sm:col-span-2" />
        <TextField path="nickname" label={t('nickname')} maxLength={50} autoComplete="nickname" />
        <TextField path="nicknameEn" label={t('nicknameEn')} placeholder={t('nicknameEnPlaceholder')} maxLength={50} />
        <TextField path="birthDate" label={t('birthDate')} type="date" required autoComplete="bday" />
        <TextField path="nationality" label={t('nationality')} maxLength={50} />
        <Choices
          path="gender"
          label={t('gender')}
          options={GENDERS.map((value) => ({ value, label: t(`genders.${value}`) }))}
        />
      </Group>

      <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
        <h3 className="text-sm font-black text-slate-900">{t('sensitiveTitle')}</h3>
        <p className="mt-1 text-xs text-slate-600">{t('sensitiveBody')}</p>
        <div className="mt-4">
          <Tick path="sensitiveConsent">{t('sensitiveConsent')}</Tick>
        </div>
        {draft.sensitiveConsent ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField path="sensitive.ethnicity" label={t('ethnicity')} maxLength={50} />
            <TextField path="sensitive.religion" label={t('religion')} maxLength={50} />
            <NumberField path="sensitive.weightKg" label={t('weight')} decimal />
            <NumberField path="sensitive.heightCm" label={t('height')} decimal />
            <Choices
              path="sensitive.bloodType"
              label={t('bloodType')}
              options={BLOOD_TYPES.map((value) => ({ value, label: value }))}
              className="sm:col-span-2"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** The photo box's shape (4:5) at twice its printed size: sharp in print, ~100 KB. */
const PHOTO_SIZE = { width: 640, height: 800 };

/**
 * The picked image as the form prints it: cropped from the centre to 4:5,
 * 640×800, on white, as a JPEG data URL. Redrawing it also stands a phone
 * photo upright (createImageBitmap applies its EXIF orientation) and leaves its
 * EXIF — the GPS position included — behind. Throws when the browser cannot read it.
 */
async function toFormPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE.width;
  canvas.height = PHOTO_SIZE.height;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** The photo for the form's photo box: picked or dropped, shown as it will print. */
function PhotoField() {
  const t = useT();
  const te = useTranslations('applicationForm.errors');
  const tr = useTranslations('apply');
  const tc = useTranslations('common');
  const { draft, set, errors } = useForm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState(false);
  const id = fieldId('photo');
  const error = problem ? te('photoType') : errors.photo ? te(errors.photo) : undefined;

  const pick = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    try {
      set('photo', await toFormPhoto(file));
      setProblem(false);
    } catch {
      setProblem(true);
    }
  };

  const drop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    void pick(e.dataTransfer.files[0]);
  };

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/75 p-4 sm:flex-row sm:items-center sm:p-5">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        className={cx(
          'grid aspect-[4/5] w-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 transition',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2',
          draft.photo ? 'border-slate-200' : 'border-dashed',
          dragging
            ? 'border-blue-500 bg-blue-50'
            : error
              ? 'border-rose-300 bg-rose-50/40'
              : 'border-slate-300 bg-slate-50/60 hover:border-blue-400',
        )}
      >
        {draft.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser; nothing to optimise
          <img src={draft.photo} alt={t('photo')} className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-10 w-10 text-slate-400" aria-hidden="true" />
        )}
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
          aria-invalid={error ? true : undefined}
          aria-required
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </label>
      <div className="min-w-0 space-y-2">
        <h3 id={`${id}-label`} className="text-sm font-black text-slate-900">
          {t('photo')}{' '}
          <span className="text-rose-600">
            <span aria-hidden="true">*</span>
            <span className="sr-only">({tr('required')})</span>
          </span>
        </h3>
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {t('photoHint')}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost inline-flex items-center gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp className="h-4 w-4" aria-hidden="true" /> {draft.photo ? t('photoChange') : t('photoPick')}
          </button>
          {draft.photo ? (
            <button
              type="button"
              className="btn btn-ghost inline-flex items-center gap-2"
              onClick={() => set('photo', '')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {tc('remove')}
            </button>
          ) : null}
        </div>
        {error ? <FieldError id={id} error={error} /> : null}
      </div>
    </section>
  );
}

/** 3. Address and how to reach them. */
export function ContactStep() {
  const t = useT();
  return (
    <div className="space-y-6">
      <Group title={t('address')} hint={t('addressHint')}>
        <TextField path="address.houseNo" label={t('houseNo')} maxLength={30} required />
        <TextField path="address.moo" label={t('moo')} maxLength={10} required />
        <TextField path="address.soi" label={t('soi')} maxLength={100} required />
        <TextField path="address.road" label={t('road')} maxLength={100} required />
        <TextField path="address.subdistrict" label={t('subdistrict')} maxLength={100} required />
        <TextField path="address.district" label={t('district')} maxLength={100} required />
        <TextField path="address.province" label={t('province')} maxLength={100} required />
        <TextField
          path="address.postalCode"
          label={t('postalCode')}
          inputMode="numeric"
          maxLength={5}
          autoComplete="postal-code"
          allow="digits"
          required
        />
      </Group>
      <Group title={t('contactChannels')}>
        <TextField
          path="mobile"
          label={t('mobile')}
          type="tel"
          required
          autoComplete="tel"
          maxLength={20}
          allow="phone"
          placeholder={t('phonePlaceholder')}
        />
        <TextField path="email" label={t('email')} type="email" required autoComplete="email" maxLength={200} />
        <TextField path="homePhone" label={t('homePhone')} type="tel" maxLength={20} allow="phone" />
      </Group>
    </div>
  );
}

/** 5. Parents and siblings, 6. marriage, 7. military service. */
export function FamilyStep() {
  const t = useT();
  const { draft } = useForm();
  const married = draft.marriage.status !== '' && draft.marriage.status !== 'SINGLE';
  return (
    <div className="space-y-6">
      <Group title={t('parents')}>
        <TextField path="family.fatherName" label={t('fatherName')} />
        <TextField path="family.fatherOccupation" label={t('fatherOccupation')} maxLength={100} />
        <TextField path="family.motherName" label={t('motherName')} />
        <TextField path="family.motherOccupation" label={t('motherOccupation')} maxLength={100} />
        <NumberField path="family.siblings" label={t('siblings')} />
        <NumberField path="family.birthOrder" label={t('birthOrder')} />
      </Group>

      <Group title={t('marital')}>
        <Choices
          path="marriage.status"
          label={t('marital')}
          options={MARITAL_STATUSES.map((value) => ({ value, label: t(`maritals.${value}`) }))}
          className="sm:col-span-2"
        />
        {married ? (
          <>
            <TextField path="marriage.spouseName" label={t('spouseName')} />
            <TextField path="marriage.spouseMaidenName" label={t('spouseMaidenName')} maxLength={100} />
            <NumberField path="marriage.children" label={t('children')} />
            <TextField path="marriage.spouseWorkplace" label={t('spouseWorkplace')} maxLength={200} />
          </>
        ) : null}
      </Group>

      {draft.gender !== 'FEMALE' ? (
        <Choices
          path="military"
          label={t('military')}
          options={MILITARY_STATUSES.map((value) => ({ value, label: t(`militaries.${value}`) }))}
        />
      ) : null}
    </div>
  );
}

/** 8. Education (the form's three rows), 9. skills. */
export function EducationStep() {
  const t = useT();
  const yesNo = [
    { value: 'yes', label: t('have') },
    { value: 'no', label: t('haveNot') },
  ];
  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">{t('educationHint')}</p>
      {FORM_EDUCATION_LEVELS.map((level) => (
        <Group key={level} title={t(`educationLevels.${level}`)}>
          <TextField path={`education.${level}.institute`} label={t('institute')} className="sm:col-span-2" />
          <TextField path={`education.${level}.major`} label={t('major')} />
          <TextField path={`education.${level}.country`} label={t('country')} maxLength={60} />
          <TextField
            path={`education.${level}.gpa`}
            label={t('gpa')}
            inputMode="decimal"
            maxLength={6}
            allow="decimal"
          />
          <TextField
            path={`education.${level}.graduationYear`}
            label={t('graduationYear')}
            placeholder={t('graduationYearPlaceholder')}
            inputMode="numeric"
            maxLength={4}
            allow="digits"
          />
        </Group>
      ))}

      <Group title={t('skills')}>
        <Languages />
        <NumberField path="skills.typingThWpm" label={t('typingTh')} />
        <NumberField path="skills.typingEnWpm" label={t('typingEn')} />
        <TextField
          path="skills.computer"
          label={t('computer')}
          placeholder={t('computerPlaceholder')}
          maxLength={300}
          className="sm:col-span-2"
        />
        <Choices path="skills.motorcycleLicense" label={t('motorcycleLicense')} options={yesNo} />
        <Choices path="skills.carLicense" label={t('carLicense')} options={yesNo} />
      </Group>
    </div>
  );
}

/** 9.1 Foreign languages: English, Chinese and/or another (named), each ticked one with its own levels. */
function Languages() {
  const t = useT();
  const { draft, set } = useForm();
  const levels = SKILL_LEVELS.map((value) => ({ value, label: t(`skillLevels.${value}`) }));
  const chosen = FORM_LANGUAGES.filter((code) => draft.skills.languages[code].on);
  return (
    <div className="space-y-3 sm:col-span-2">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-600">{t('language')}</legend>
        <p className="text-[11px] text-slate-500">{t('languageHint')}</p>
        <div className="flex flex-wrap gap-2">
          {FORM_LANGUAGES.map((code) => {
            const on = draft.skills.languages[code].on;
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                onClick={() => set(`skills.languages.${code}.on`, !on)}
                className={cx(
                  'rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                  'focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none',
                  on
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'border-slate-300 bg-white/85 text-slate-700 hover:border-blue-400 hover:bg-blue-50',
                )}
              >
                {t(`languages.${code}`)}
              </button>
            );
          })}
        </div>
      </fieldset>
      {chosen.map((code) => (
        <div key={code} className="grid gap-4 rounded-2xl border border-slate-200 bg-white/60 p-4 sm:grid-cols-3">
          {code === 'OTHER' ? (
            <TextField
              path="skills.languages.OTHER.other"
              label={t('languageOther')}
              placeholder={t('languageOtherPlaceholder')}
              maxLength={50}
              required
              className="sm:col-span-3"
            />
          ) : (
            <h4 className="text-sm font-bold text-slate-900 sm:col-span-3">{t(`languages.${code}`)}</h4>
          )}
          <Choices path={`skills.languages.${code}.speak`} label={t('speak')} options={levels} />
          <Choices path={`skills.languages.${code}.read`} label={t('read')} options={levels} />
          <Choices path={`skills.languages.${code}.write`} label={t('write')} options={levels} />
        </div>
      ))}
    </div>
  );
}

function MonthField({ path, label, hint }: { path: string; label: string; hint?: string }) {
  const { draft, set, errors } = useForm();
  const tp = useTranslations('apply.picker');
  const te = useTranslations('applicationForm.errors');
  const id = fieldId(path);
  const error = errors[path] ? te(errors[path]) : undefined;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <MonthYearPicker
        id={id}
        value={read(draft, path)}
        onChange={(value) => set(path, value)}
        placeholder={tp('selectMonth')}
        invalid={!!error}
      />
    </Field>
  );
}

function JobFields({ which, full }: { which: 'currentJob' | 'previousJob'; full: boolean }) {
  const t = useT();
  return (
    <>
      <TextField path={`${which}.company`} label={t('company')} />
      <TextField path={`${which}.position`} label={t('position')} />
      {full ? (
        <TextField path={`${which}.duties`} label={t('duties')} maxLength={300} className="sm:col-span-2" />
      ) : null}
      <MonthField path={`${which}.from`} label={t('from')} />
      <MonthField path={`${which}.to`} label={t('to')} hint={full ? t('toHint') : undefined} />
      <TextField path={`${which}.lastSalary`} label={t('lastSalary')} inputMode="numeric" maxLength={50} />
      {full ? (
        <>
          <TextField path={`${which}.otherIncome`} label={t('otherIncome')} inputMode="numeric" maxLength={50} />
          <TextField path={`${which}.totalIncome`} label={t('totalIncome')} inputMode="numeric" maxLength={50} />
          <TextField path={`${which}.benefits`} label={t('benefits')} maxLength={200} />
        </>
      ) : null}
      <TextField path={`${which}.reasonForLeaving`} label={t('reasonForLeaving')} maxLength={200} />
    </>
  );
}

/** A "Yes / None" switch in front of a block. */
function HasToggle({ path, label }: { path: 'hasCurrentJob' | 'hasPreviousJob'; label: string }) {
  const t = useT();
  const { draft, set } = useForm();
  const on = draft[path];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-black text-slate-900">{label}</h3>
      <div
        className="inline-flex rounded-2xl border border-slate-300 bg-white p-1"
        role="radiogroup"
        aria-label={label}
      >
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={on === value}
            onClick={() => set(path, value)}
            className={
              on === value
                ? 'rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white'
                : 'rounded-xl px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100'
            }
          >
            {value ? t('hasJob') : t('noJob')}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 10. The current job and the one before; the emergency contact. */
export function WorkStep() {
  const t = useT();
  const { draft, errors } = useForm();
  const te = useTranslations('applicationForm.errors');
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
        <HasToggle path="hasCurrentJob" label={t('currentJob')} />
        {draft.hasCurrentJob ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <JobFields which="currentJob" full />
          </div>
        ) : null}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white/75 p-4 sm:p-5">
        <HasToggle path="hasPreviousJob" label={t('previousJob')} />
        {draft.hasPreviousJob ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <JobFields which="previousJob" full={false} />
          </div>
        ) : null}
      </section>
      <Group title={t('emergency')} hint={t('emergencyHint')}>
        <TextField path="emergency.name" label={t('emergencyName')} required />
        <TextField path="emergency.relationship" label={t('relationship')} maxLength={50} required />
        <TextField
          path="emergency.phone"
          label={t('emergencyPhone')}
          type="tel"
          maxLength={20}
          allow="phone"
          required
        />
      </Group>
      {errors.currentJob || errors.previousJob ? <FieldError id="af-work" error={te('invalid')} /> : null}
    </div>
  );
}
