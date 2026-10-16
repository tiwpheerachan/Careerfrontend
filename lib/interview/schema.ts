import { z } from 'zod';
import { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';
import { GENERAL_ITEMS, SCORE_MAX, SCORE_MIN, SENIOR_ITEMS } from './scoring';

/**
 * An interview evaluation as the admin form sends it (and the API takes it).
 * The evaluator is never sent: it is whoever is signed in.
 */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

const Score = z.number().int().min(SCORE_MIN).max(SCORE_MAX);
const PublicId = z
  .union([z.uuid(), z.literal('')])
  .nullable()
  .optional()
  .transform((value) => value || null);

/** The candidate links: at most one — and, where `required`, exactly one. */
function linkIssues(
  form: { applicationId: string | null; applicationFormId: string | null; interviewCandidateId: string | null },
  required: boolean,
) {
  const links = [form.applicationId, form.applicationFormId, form.interviewCandidateId].filter(Boolean).length;
  if (links > 1)
    return [{ code: 'custom' as const, path: ['applicationFormId'], message: 'link one candidate, not several' }];
  if (required && links === 0)
    return [
      {
        code: 'custom' as const,
        path: ['applicationId'],
        message: 'pick the candidate: an application, a form, or a candidate added without one',
      },
    ];
  return [];
}

export const InterviewEvaluationInput = z
  .object({
    applicationId: PublicId.meta({ description: 'The application being evaluated, if it is one.' }),
    applicationFormId: PublicId.meta({ description: 'Or the application form.' }),
    interviewCandidateId: PublicId.meta({
      description: 'Or a candidate HR added before they had an application — exactly one of the three is required.',
    }),
    candidateName: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .meta({ description: 'Ignored: the linked record’s name is stored.' }),
    position: text(150),
    department: text(150),
    interviewDate: z.iso.date(),
    round: z.union([z.literal(1), z.literal(2)]).meta({ description: '1st or 2nd interview.' }),
    evaluatorRole: z.enum(EVALUATOR_ROLES).meta({ description: 'HR, or the hiring department.' }),
    senior: z.boolean().meta({ description: 'Senior position and above: items 11–15 are scored too.' }),
    generalScores: z
      .array(Score)
      .length(GENERAL_ITEMS.length)
      .meta({ description: 'Items 1–10, each 0–5, in the form’s order.' }),
    seniorScores: z
      .array(Score)
      .length(SENIOR_ITEMS.length)
      .nullable()
      .optional()
      .transform((value) => value ?? null)
      .meta({ description: 'Items 11–15, each 0–5 — only (and required) when senior is true.' }),
    result: z.enum(EVALUATION_RESULTS).meta({ description: 'The evaluator’s verdict for this round.' }),
    failReason: text(300),
    comment: text(2000),
  })
  .superRefine((form, ctx) => {
    // Picked from the system, never typed in: so all of one person's evaluations count together.
    linkIssues(form, true).forEach((issue) => ctx.addIssue(issue));
    if (form.senior && !form.seniorScores) {
      ctx.addIssue({ code: 'custom', path: ['seniorScores'], message: 'score items 11–15 for a Senior position' });
    }
    if (!form.senior && form.seniorScores) {
      ctx.addIssue({ code: 'custom', path: ['seniorScores'], message: 'items 11–15 are only for a Senior position' });
    }
  });

export type InterviewEvaluationInput = z.output<typeof InterviewEvaluationInput>;

/**
 * What an invited evaluator sends (POST /api/v1/evaluate/{token}): only the
 * scores and the verdict — the candidate, the round and the side are the
 * invitation's, the evaluator is whoever is signed in.
 */
export const GuestEvaluationInput = z
  .object({
    senior: z.boolean(),
    generalScores: z.array(Score).length(GENERAL_ITEMS.length),
    seniorScores: z
      .array(Score)
      .length(SENIOR_ITEMS.length)
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    result: z.enum(EVALUATION_RESULTS),
    failReason: text(300),
    comment: text(2000),
  })
  .superRefine((form, ctx) => {
    if (form.senior !== Boolean(form.seniorScores)) {
      ctx.addIssue({
        code: 'custom',
        path: ['seniorScores'],
        message: 'items 11–15 go with (and only with) a Senior position',
      });
    }
  });

export type GuestEvaluationInput = z.output<typeof GuestEvaluationInput>;

/** HR making an invitation. */
export const InvitationInput = z
  .object({
    applicationId: PublicId,
    applicationFormId: PublicId,
    interviewCandidateId: PublicId,
    candidateName: z.string().trim().min(1).max(150),
    position: text(150),
    department: text(150),
    round: z.union([z.literal(1), z.literal(2)]),
    evaluatorRole: z.enum(EVALUATOR_ROLES),
    senior: z.boolean().default(false).meta({ description: 'Senior position: the invitees score items 11–15 too.' }),
    invitees: z
      .array(
        z.object({
          email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
          name: text(150),
          unionId: text(100),
          jobTitle: text(150),
          department: text(150),
        }),
      )
      .min(1)
      .max(20)
      .refine((list) => new Set(list.map((p) => p.email)).size === list.length, 'each person once'),
  })
  .superRefine((form, ctx) => linkIssues(form, false).forEach((issue) => ctx.addIssue(issue)));

export type InvitationInput = z.output<typeof InvitationInput>;

/**
 * HR adding a candidate who has no application yet (migration 0013): enough to
 * invite and evaluate them, and to find their form when it comes in.
 */
export const InterviewCandidateInput = z.object({
  name: z.string().trim().min(1).max(150),
  position: text(150),
  department: text(150),
  /** 9–15 digits with + ( ) - and spaces, as on the application form. */
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9()\-\s]{9,40}$/, 'must be a phone number')
    .refine((value) => {
      const digits = value.replace(/\D/g, '').length;
      return digits >= 9 && digits <= 15;
    }, 'must be a phone number of 9–15 digits'),
});

export type InterviewCandidateInput = z.output<typeof InterviewCandidateInput>;

/** Linking a candidate HR added to their application or form, once it exists. */
export const InterviewCandidateLinkInput = z
  .object({ applicationId: PublicId, applicationFormId: PublicId })
  .refine((v) => Boolean(v.applicationId) !== Boolean(v.applicationFormId), {
    path: ['applicationId'],
    message: 'link to one application or one form',
  });

export type InterviewCandidateLinkInput = z.output<typeof InterviewCandidateLinkInput>;
