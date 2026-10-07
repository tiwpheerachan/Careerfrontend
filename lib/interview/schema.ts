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
