'use client';

import { useTranslations } from 'next-intl';
import { ApplySelect } from '@/components/apply/apply-select';
import { Field, FieldError } from '@/components/apply/field';
import { MonthYearPicker } from '@/components/apply/month-year-picker';
import {
  APPLICATION_FORM_LETTERHEADS,
  BLOOD_TYPES,
  FORM_EDUCATION_LEVELS,
  GENDERS,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  SKILL_LEVELS,
} from '@/lib/constants';
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
          path="expectedSalary"
          label={t('expectedSalary')}
          placeholder={t('expectedSalaryPlaceholder')}
          inputMode="numeric"
          maxLength={50}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          path="nameTh"
          label={t('nameTh')}
          placeholder={t('nameThPlaceholder')}
          required
          autoComplete="name"
          className="sm:col-span-2"
        />
        <TextField path="nameEn" label={t('nameEn')} autoComplete="name" />
        <TextField path="nickname" label={t('nickname')} maxLength={50} autoComplete="nickname" />
        <TextField path="birthDate" label={t('birthDate')} type="date" required autoComplete="bday" />
        <TextField path="nationality" label={t('nationality')} maxLength={50} />
        <Choices
          path="gender"
          label={t('gender')}
          options={GENDERS.map((value) => ({ value, label: t(`genders.${value}`) }))}
        />
      </div>

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
            <NumberField path="sensitive.weightKg" label={t('weight')} />
            <NumberField path="sensitive.heightCm" label={t('height')} />
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

/** 3. Address and how to reach them. */
export function ContactStep() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path="mobile" label={t('mobile')} type="tel" required autoComplete="tel" maxLength={40} />
        <TextField path="email" label={t('email')} type="email" required autoComplete="email" maxLength={200} />
        <TextField path="homePhone" label={t('homePhone')} type="tel" maxLength={40} />
      </div>
      <Group title={t('address')}>
        <TextField path="address.houseNo" label={t('houseNo')} maxLength={30} />
        <TextField path="address.moo" label={t('moo')} maxLength={10} />
        <TextField path="address.soi" label={t('soi')} maxLength={100} />
        <TextField path="address.road" label={t('road')} maxLength={100} />
        <TextField path="address.subdistrict" label={t('subdistrict')} maxLength={100} />
        <TextField path="address.district" label={t('district')} maxLength={100} />
        <TextField path="address.province" label={t('province')} maxLength={100} />
        <TextField
          path="address.postalCode"
          label={t('postalCode')}
          inputMode="numeric"
          maxLength={5}
          autoComplete="postal-code"
        />
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
  const levels = SKILL_LEVELS.map((value) => ({ value, label: t(`skillLevels.${value}`) }));
  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">{t('educationHint')}</p>
      {FORM_EDUCATION_LEVELS.map((level) => (
        <Group key={level} title={t(`educationLevels.${level}`)}>
          <TextField path={`education.${level}.institute`} label={t('institute')} className="sm:col-span-2" />
          <TextField path={`education.${level}.major`} label={t('major')} />
          <TextField path={`education.${level}.country`} label={t('country')} maxLength={60} />
          <TextField path={`education.${level}.gpa`} label={t('gpa')} inputMode="decimal" maxLength={10} />
          <TextField
            path={`education.${level}.graduationYear`}
            label={t('graduationYear')}
            placeholder={t('graduationYearPlaceholder')}
            inputMode="numeric"
            maxLength={10}
          />
        </Group>
      ))}

      <Group title={t('skills')}>
        <TextField
          path="skills.language"
          label={t('language')}
          placeholder={t('languagePlaceholder')}
          maxLength={50}
          className="sm:col-span-2"
        />
        <Choices path="skills.speak" label={t('speak')} options={levels} />
        <Choices path="skills.read" label={t('read')} options={levels} />
        <Choices path="skills.write" label={t('write')} options={levels} />
        <div className="hidden sm:block" />
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
        <TextField path="emergency.name" label={t('emergencyName')} />
        <TextField path="emergency.relationship" label={t('relationship')} maxLength={50} />
        <TextField path="emergency.phone" label={t('emergencyPhone')} type="tel" maxLength={40} />
      </Group>
      {errors.currentJob || errors.previousJob ? <FieldError id="af-work" error={te('invalid')} /> : null}
    </div>
  );
}
