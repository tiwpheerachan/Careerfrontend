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

export const InterviewEvaluationInput = z
  .object({
    applicationId: PublicId.meta({ description: 'The application being evaluated, if it is one.' }),
    applicationFormId: PublicId.meta({ description: 'Or the application form. Neither = typed in by hand.' }),
    candidateName: z.string().trim().min(1).max(150),
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
    if (form.applicationId && form.applicationFormId) {
      ctx.addIssue({ code: 'custom', path: ['applicationFormId'], message: 'link an application or a form, not both' });
    }
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
  .superRefine((form, ctx) => {
    if (form.applicationId && form.applicationFormId) {
      ctx.addIssue({ code: 'custom', path: ['applicationFormId'], message: 'link an application or a form, not both' });
    }
  });

export type InvitationInput = z.output<typeof InvitationInput>;
