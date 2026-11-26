import { z } from 'zod';
import { SUBMISSION_HEADER } from '@/lib/submission-headers';

/** The browser's id for this submission (components/submission.ts), or null: none sent, or not a uuid. */
export function submissionIdOf(request: Request): string | null {
  return z.uuid().safeParse(request.headers.get(SUBMISSION_HEADER)).data ?? null;
}
