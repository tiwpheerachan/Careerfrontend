import type { z } from 'zod';
import { ApplicationFormInput } from '@/lib/application-form/schema';
import {
  APPLICATION_FORM_LETTERHEADS,
  BLOOD_TYPES,
  FORM_EDUCATION_LEVELS,
  GENDERS,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  SKILL_LEVELS,
} from '@/lib/constants';

/**
 * The form as the wizard holds it: every field a string (or a tick), exactly
 * as typed, so nothing jumps while someone is typing "2" on the way to "25".
 * toInput() turns it into what POST /api/v1/application-forms takes, and the
 * shared zod schema (lib/application-form/schema.ts) checks it — the same
 * check the server makes.
 */
export type Letterhead = (typeof APPLICATION_FORM_LETTERHEADS)[number];
export type EducationLevel = (typeof FORM_EDUCATION_LEVELS)[number];
type Choice<T extends readonly string[]> = T[number] | '';
type YesNo = '' | 'yes' | 'no';

export interface JobDraft {
  company: string;
  position: string;
  duties: string;
  from: string;
  to: string;
  lastSalary: string;
  otherIncome: string;
  totalIncome: string;
  benefits: string;
  reasonForLeaving: string;
}

export interface EducationDraft {
  institute: string;
  country: string;
  gpa: string;
  major: string;
  graduationYear: string;
}

export interface Draft {
  letterhead: Letterhead | '';
  /** A published job's code, OTHER_JOB, or '' (nothing chosen yet). */
  jobCode: string;
  positionOther: string;
  expectedSalary: string;
  nameTh: string;
  nameEn: string;
  nickname: string;
  gender: Choice<typeof GENDERS>;
  birthDate: string;
  nationality: string;
  sensitiveConsent: boolean;
  sensitive: {
    ethnicity: string;
    religion: string;
    bloodType: Choice<typeof BLOOD_TYPES>;
    weightKg: string;
    heightCm: string;
  };
  address: {
    houseNo: string;
    moo: string;
    soi: string;
    road: string;
    subdistrict: string;
    district: string;
    province: string;
    postalCode: string;
  };
  homePhone: string;
  mobile: string;
  email: string;
  family: {
    fatherName: string;
    fatherOccupation: string;
    motherName: string;
    motherOccupation: string;
    siblings: string;
    birthOrder: string;
  };
  marriage: {
    status: Choice<typeof MARITAL_STATUSES>;
    spouseName: string;
    spouseMaidenName: string;
    children: string;
    spouseWorkplace: string;
  };
  military: Choice<typeof MILITARY_STATUSES>;
  education: Record<EducationLevel, EducationDraft>;
  skills: {
    language: string;
    speak: Choice<typeof SKILL_LEVELS>;
    read: Choice<typeof SKILL_LEVELS>;
    write: Choice<typeof SKILL_LEVELS>;
    typingThWpm: string;
    typingEnWpm: string;
    computer: string;
    motorcycleLicense: YesNo;
    carLicense: YesNo;
  };
  hasCurrentJob: boolean;
  currentJob: JobDraft;
  hasPreviousJob: boolean;
  previousJob: JobDraft;
  emergency: { name: string; relationship: string; phone: string };
  certified: boolean;
}

/** The "other position" choice in the job list. */
export const OTHER_JOB = '__other__';

const emptyJob = (): JobDraft => ({
  company: '',
  position: '',
  duties: '',
  from: '',
  to: '',
  lastSalary: '',
  otherIncome: '',
  totalIncome: '',
  benefits: '',
  reasonForLeaving: '',
});

const emptyEducation = (): EducationDraft => ({ institute: '', country: '', gpa: '', major: '', graduationYear: '' });

export function emptyDraft(): Draft {
  return {
    letterhead: '',
    jobCode: '',
    positionOther: '',
    expectedSalary: '',
    nameTh: '',
    nameEn: '',
    nickname: '',
    gender: '',
    birthDate: '',
    nationality: '',
    sensitiveConsent: false,
    sensitive: { ethnicity: '', religion: '', bloodType: '', weightKg: '', heightCm: '' },
    address: { houseNo: '', moo: '', soi: '', road: '', subdistrict: '', district: '', province: '', postalCode: '' },
    homePhone: '',
    mobile: '',
    email: '',
    family: {
      fatherName: '',
      fatherOccupation: '',
      motherName: '',
      motherOccupation: '',
      siblings: '',
      birthOrder: '',
    },
    marriage: { status: '', spouseName: '', spouseMaidenName: '', children: '', spouseWorkplace: '' },
    military: '',
    education: { SECONDARY: emptyEducation(), DIPLOMA: emptyEducation(), DEGREE: emptyEducation() },
    skills: {
      language: '',
      speak: '',
      read: '',
      write: '',
      typingThWpm: '',
      typingEnWpm: '',
      computer: '',
      motorcycleLicense: '',
      carLicense: '',
    },
    hasCurrentJob: true,
    currentJob: emptyJob(),
    hasPreviousJob: false,
    previousJob: emptyJob(),
    emergency: { name: '', relationship: '', phone: '' },
    certified: false,
  };
}

/** "" → null; anything else a number (NaN when it is not one, which the schema then refuses). */
const num = (value: string) => (value.trim() === '' ? null : Number(value.replace(/,/g, '')));
const choice = <T extends string>(value: T | '') => (value === '' ? null : value);
const yesNo = (value: YesNo) => (value === '' ? null : value === 'yes');

/**
 * The draft as the API takes it. `educationLevels` says which level each
 * entry of `education` is, so an error on `education.1.gpa` can be put on the
 * right row.
 */
export function toInput(draft: Draft, locale: string, turnstileToken?: string) {
  const educationLevels = FORM_EDUCATION_LEVELS.filter((level) =>
    Object.values(draft.education[level]).some((v) => v.trim() !== ''),
  );
  const input = {
    locale,
    letterhead: draft.letterhead || undefined,
    jobCode: draft.jobCode === OTHER_JOB ? '' : draft.jobCode,
    positionOther: draft.jobCode === OTHER_JOB ? draft.positionOther : '',
    expectedSalary: draft.expectedSalary,
    nameTh: draft.nameTh,
    nameEn: draft.nameEn,
    nickname: draft.nickname,
    gender: choice(draft.gender),
    address: draft.address,
    homePhone: draft.homePhone,
    mobile: draft.mobile,
    email: draft.email,
    birthDate: draft.birthDate,
    nationality: draft.nationality,
    sensitiveConsent: draft.sensitiveConsent,
    sensitive: draft.sensitiveConsent
      ? {
          ethnicity: draft.sensitive.ethnicity,
          religion: draft.sensitive.religion,
          bloodType: choice(draft.sensitive.bloodType),
          weightKg: num(draft.sensitive.weightKg),
          heightCm: num(draft.sensitive.heightCm),
        }
      : null,
    family: { ...draft.family, siblings: num(draft.family.siblings), birthOrder: num(draft.family.birthOrder) },
    marriage: { ...draft.marriage, status: choice(draft.marriage.status), children: num(draft.marriage.children) },
    military: choice(draft.military),
    education: educationLevels.map((level) => ({ level, ...draft.education[level] })),
    skills: {
      ...draft.skills,
      speak: choice(draft.skills.speak),
      read: choice(draft.skills.read),
      write: choice(draft.skills.write),
      typingThWpm: num(draft.skills.typingThWpm),
      typingEnWpm: num(draft.skills.typingEnWpm),
      motorcycleLicense: yesNo(draft.skills.motorcycleLicense),
      carLicense: yesNo(draft.skills.carLicense),
    },
    currentJob: draft.hasCurrentJob ? draft.currentJob : null,
    previousJob: draft.hasPreviousJob ? draft.previousJob : null,
    emergency: draft.emergency,
    certified: draft.certified,
    turnstileToken,
  };
  return { input, educationLevels };
}

export const STEPS = ['position', 'personal', 'contact', 'family', 'education', 'work', 'review'] as const;
export type Step = (typeof STEPS)[number];

/** Which top-level fields each step owns: an error is shown on the step whose field it is. */
const STEP_FIELDS: Record<Step, string[]> = {
  position: ['letterhead', 'jobCode', 'positionOther', 'expectedSalary'],
  personal: ['nameTh', 'nameEn', 'nickname', 'gender', 'birthDate', 'nationality', 'sensitiveConsent', 'sensitive'],
  contact: ['address', 'homePhone', 'mobile', 'email'],
  family: ['family', 'marriage', 'military'],
  education: ['education', 'skills'],
  work: ['currentJob', 'previousJob', 'emergency'],
  review: ['certified', 'turnstileToken', 'locale'],
};

export function stepOf(path: string): Step {
  const head = path.split('.')[0]!;
  return STEPS.find((step) => STEP_FIELDS[step].includes(head)) ?? 'review';
}

export type ErrorKey =
  | 'required'
  | 'choose'
  | 'invalid'
  | 'phone'
  | 'email'
  | 'birthDate'
  | 'birthDateFuture'
  | 'birthDateYoung'
  | 'postalCode'
  | 'position'
  | 'certify'
  | 'number'
  | 'salary'
  | 'gpa'
  | 'year'
  | 'birthOrder';

/** Field path → which message to show. Paths name draft fields (education by level, not by index). */
export type Errors = Record<string, ErrorKey>;

const PHONE = /(^|\.)(mobile|homePhone|phone)$/;

function errorKey(path: string, issue: z.core.$ZodIssue, empty: boolean): ErrorKey {
  if (path === 'certified') return 'certify';
  if (path === 'positionOther' || path === 'jobCode') return 'position';
  if (
    empty &&
    (path === 'letterhead' || path === 'nameTh' || path === 'mobile' || path === 'email' || path === 'birthDate')
  )
    return 'required';
  if (PHONE.test(path)) return 'phone';
  if (path === 'email') return 'email';
  if (path === 'birthDate') return 'birthDate';
  if (path.endsWith('postalCode')) return 'postalCode';
  if (issue.code === 'invalid_type' && issue.expected === 'number') return 'number';
  return empty ? 'required' : 'invalid';
}

/** Why a birth date was refused, when it is a date at all: in the future, or under 15. */
function birthDateKey(value: unknown): ErrorKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'birthDate';
  const born = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(born)) return 'birthDate';
  if (born > Date.now()) return 'birthDateFuture';
  const age = (Date.now() - born) / (365.25 * 24 * 3600 * 1000);
  return age < 15 ? 'birthDateYoung' : 'birthDate';
}

/*
 * Checks the shared schema does not make (it keeps these as free text, as on
 * paper) but that catch plain typos before HR sees them. Client-side only:
 * the server still accepts them — see lib/application-form/schema.ts.
 */
/**
 * An amount or a range of amounts: "25000", "25,000", "25,000 - 30,000", "25k",
 * "฿25,000", "25,000 บาท". Only checked when there are digits: words alone
 * ("ตามตกลง", "ตามโครงสร้างบริษัท") are an answer, as on paper.
 */
const AMOUNT = '\\d[\\d,.\\s]*(?:k|K)?';
const MONEY = new RegExp(`^(?:฿\\s*)?${AMOUNT}(?:\\s*[-–~]\\s*(?:฿\\s*)?${AMOUNT})?\\s*(?:บาท|baht|thb|元|฿)?$`, 'i');
/** A grade point average: a number from 0 to 100 (4.00 here; other scales abroad). */
const isGpa = (v: string) => /^\d{1,3}(\.\d{1,2})?$/.test(v) && Number(v) <= 100;
/** A year as written on paper: Buddhist (2400–2700) or Christian (1950–2100) era, 4 digits. */
const isYear = (v: string) => /^\d{4}$/.test(v) && ((+v >= 1950 && +v <= 2100) || (+v >= 2400 && +v <= 2700));

function extraChecks(draft: Draft): Errors {
  const errors: Errors = {};
  const money = (path: string, value: string) => {
    if (/\d/.test(value) && !MONEY.test(value.trim())) errors[path] = 'salary';
  };
  money('expectedSalary', draft.expectedSalary);
  for (const which of ['currentJob', 'previousJob'] as const) {
    if (which === 'currentJob' ? !draft.hasCurrentJob : !draft.hasPreviousJob) continue;
    money(`${which}.lastSalary`, draft[which].lastSalary);
    money(`${which}.otherIncome`, draft[which].otherIncome);
    money(`${which}.totalIncome`, draft[which].totalIncome);
  }
  for (const level of FORM_EDUCATION_LEVELS) {
    const row = draft.education[level];
    if (row.gpa.trim() && !isGpa(row.gpa.trim())) errors[`education.${level}.gpa`] = 'gpa';
    if (row.graduationYear.trim() && !isYear(row.graduationYear.trim()))
      errors[`education.${level}.graduationYear`] = 'year';
  }
  const siblings = Number(draft.family.siblings);
  const order = Number(draft.family.birthOrder);
  if (
    draft.family.siblings.trim() &&
    draft.family.birthOrder.trim() &&
    Number.isInteger(siblings) &&
    Number.isInteger(order) &&
    siblings > 0 &&
    order > siblings
  )
    errors['family.birthOrder'] = 'birthOrder';
  return errors;
}

/** Reads a value out of the draft by a dotted path, for "was it empty". */
function valueAt(draft: Draft, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], draft);
}

/**
 * Every problem with the draft, by draft path. `only` limits it to one step's
 * fields — so "Next" on step 1 does not complain about step 5.
 */
export function validate(draft: Draft, locale: string, only?: Step): Errors {
  const { input, educationLevels } = toInput(draft, locale);
  const parsed = ApplicationFormInput.safeParse(input);
  const errors: Errors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const parts = issue.path.map(String);
      // education.<index>.<field> → education.<LEVEL>.<field>
      if (parts[0] === 'education' && parts[1] !== undefined && educationLevels[Number(parts[1])]) {
        parts[1] = educationLevels[Number(parts[1])]!;
      }
      // A wrong sensitive or job field is reported where the draft keeps it.
      const path = parts.join('.');
      if (only && stepOf(path) !== only) continue;
      const value = valueAt(draft, path);
      errors[path] ??= errorKey(path, issue, value === '' || value === undefined || value === null);
    }
  }
  if (errors.birthDate === 'birthDate') errors.birthDate = birthDateKey(draft.birthDate);
  for (const [path, key] of Object.entries(extraChecks(draft))) {
    if (!only || stepOf(path) === only) errors[path] ??= key;
  }
  // The schema checks "a job or a position" only once everything else passes; the wizard needs it on step 1.
  if (
    (!only || only === 'position') &&
    (!draft.jobCode || (draft.jobCode === OTHER_JOB && !draft.positionOther.trim()))
  )
    errors.positionOther ??= 'position';
  return errors;
}

/** The DOM id of a field, from its draft path. */
export const fieldId = (path: string) => `af-${path.replace(/\./g, '-')}`;
