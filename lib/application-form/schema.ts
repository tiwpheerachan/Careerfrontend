import { z } from 'zod';
import {
  APPLICATION_FORM_LETTERHEADS,
  BLOOD_TYPES,
  FORM_EDUCATION_LEVELS,
  GENDERS,
  LOCALES,
  NAME_TITLES,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  SKILL_LEVELS,
} from '@/lib/constants';

/**
 * The paper application form (ใบสมัครงาน), as data — every line of the
 * company's blank form, section by section, in the form's own numbering.
 *
 * One shape, used by the wizard on the public site (to check each step before
 * moving on), by POST /api/v1/application-forms (the same check, trusted),
 * and by the PDF (lib/application-form/pdf.tsx), which prints it back onto the
 * blank form. Nothing is required that the paper form does not need to be
 * useful: the position, the name, a way to reach the person, a birth date, and
 * the declaration.
 *
 * Section 4's ethnicity, religion, blood type, weight and height are sensitive
 * personal data under the PDPA (มาตรา 26): optional, kept apart (`sensitive`),
 * stored only with their own consent, and shown only to admins with manage.
 */

/** Optional free text: trimmed, and "" means "not given" (null). */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

const required = (max: number) => z.string().trim().min(1).max(max);

/** A phone number: digits with + ( ) - and spaces, 9–15 digits (a Thai landline has 9, E.164 at most 15). */
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9()\-\s]{9,40}$/, 'must be a phone number')
  .refine((value) => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 9 && digits <= 15;
  }, 'must be a phone number of 9–15 digits');
const optionalPhone = z
  .union([phone, z.literal('')])
  .nullable()
  .optional()
  .transform((value) => value || null);

/** A whole number in a range, or nothing. */
const count = (max: number) =>
  z
    .number()
    .int()
    .min(0)
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .enum(values)
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const flag = z
  .boolean()
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const YearMonth = z
  .union([z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM'), z.literal('')])
  .nullable()
  .optional()
  .transform((value) => value || null);

// --- 3. Address --------------------------------------------------------------------------

export const FormAddress = z.object({
  houseNo: text(30),
  moo: text(10),
  soi: text(100),
  road: text(100),
  subdistrict: text(100),
  district: text(100),
  province: text(100),
  postalCode: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{5}$/, 'must be 5 digits'),
      z.literal(''),
    ])
    .nullable()
    .optional()
    .transform((value) => value || null),
});

// --- 4. Sensitive (PDPA s.26) ---------------------------------------------------------------

/** A measurement: 0 to max, to one decimal place (65.5 kg), or nothing. */
const measure = (max: number) =>
  z
    .number()
    .min(0)
    .max(max)
    .refine((value) => Math.abs(Math.round(value * 10) - value * 10) < 1e-9, 'one decimal place at most')
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const FormSensitive = z.object({
  ethnicity: text(50),
  religion: text(50),
  bloodType: choice(BLOOD_TYPES),
  weightKg: measure(300),
  heightCm: measure(250),
});

// --- 5–7. Family, marriage, military ---------------------------------------------------------

export const FormFamily = z.object({
  fatherName: text(150),
  fatherOccupation: text(100),
  motherName: text(150),
  motherOccupation: text(100),
  siblings: count(30),
  birthOrder: count(30),
});

export const FormMarriage = z.object({
  status: choice(MARITAL_STATUSES),
  spouseName: text(150),
  spouseMaidenName: text(100),
  children: count(30),
  spouseWorkplace: text(200),
});

// --- 8. Education: the form's three rows --------------------------------------------------

export const FormEducation = z.object({
  level: z.enum(FORM_EDUCATION_LEVELS),
  institute: text(150),
  country: text(60),
  gpa: text(10),
  major: text(150),
  /** As written — "2565" or "2022" both appear on paper. */
  graduationYear: text(10),
});

// --- 9. Skills ---------------------------------------------------------------------------------

export const FormSkills = z.object({
  language: text(50),
  speak: choice(SKILL_LEVELS),
  read: choice(SKILL_LEVELS),
  write: choice(SKILL_LEVELS),
  typingThWpm: count(300),
  typingEnWpm: count(300),
  computer: text(300),
  motorcycleLicense: flag,
  carLicense: flag,
});

// --- 10. Work: the current job and the one before ------------------------------------------

export const FormJob = z.object({
  company: text(150),
  position: text(150),
  duties: text(300),
  from: YearMonth,
  /** Empty for the current job = still there. */
  to: YearMonth,
  lastSalary: text(50),
  otherIncome: text(50),
  totalIncome: text(50),
  benefits: text(200),
  reasonForLeaving: text(200),
});

export const FormEmergency = z.object({
  name: text(150),
  relationship: text(50),
  phone: optionalPhone,
});

export const ApplicationFormInput = z
  .object({
    locale: z.enum(LOCALES).default('th'),
    /** Which company's form: its letterhead goes on the PDF. */
    letterhead: z.enum(APPLICATION_FORM_LETTERHEADS),

    // 1. Position
    jobCode: z
      .string()
      .trim()
      .max(64)
      .nullable()
      .optional()
      .transform((value) => value?.toUpperCase() || null)
      .meta({ description: 'A published job (its code), or nothing and positionOther.' }),
    positionOther: text(150).meta({ description: 'The position, when it is not one of the published jobs.' }),
    expectedSalary: text(50),

    // 2. Name — the title apart, so it prints in each language (นาย … / Mr. …)
    nameTitle: choice(NAME_TITLES),
    nameTh: required(150),
    nameEn: text(150),
    nickname: text(50),
    gender: choice(GENDERS),

    // 3. Address and contact
    address: FormAddress,
    homePhone: optionalPhone,
    mobile: phone,
    email: z.string().trim().max(200).pipe(z.email()),

    // 4. Birth date, nationality; the sensitive part only with its consent
    birthDate: z.iso.date().refine((value) => {
      const age = (Date.now() - new Date(`${value}T00:00:00Z`).getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 15 && age <= 90;
    }, 'must be a real birth date'),
    nationality: text(50),
    sensitiveConsent: z.boolean().default(false),
    sensitive: FormSensitive.nullable().optional(),

    family: FormFamily,
    marriage: FormMarriage,
    military: choice(MILITARY_STATUSES),

    education: z
      .array(FormEducation)
      .max(3)
      .refine((rows) => new Set(rows.map((r) => r.level)).size === rows.length, 'one row per level'),
    skills: FormSkills,
    currentJob: FormJob.nullable().optional(),
    previousJob: FormJob.nullable().optional(),
    emergency: FormEmergency,

    certified: z.literal(true, { error: 'the declaration must be accepted' }),
    turnstileToken: z.string().max(2048).optional(),
  })
  .superRefine((form, ctx) => {
    if (!form.jobCode && !form.positionOther) {
      ctx.addIssue({ code: 'custom', path: ['positionOther'], message: 'choose a job or write the position' });
    }
  });

export type ApplicationFormInput = z.input<typeof ApplicationFormInput>;
export type ApplicationFormData = z.output<typeof ApplicationFormInput>;

/**
 * What is stored as the answers: everything but the position, the contact
 * columns, the sensitive part and the bookkeeping, which have columns of their own.
 */
export type ApplicationFormAnswers = Omit<
  ApplicationFormData,
  | 'locale'
  | 'letterhead'
  | 'jobCode'
  | 'positionOther'
  | 'sensitiveConsent'
  | 'sensitive'
  | 'certified'
  | 'turnstileToken'
>;
export type ApplicationFormSensitive = z.output<typeof FormSensitive>;
