import 'server-only';
import { parseBody, parseValue } from '@/lib/api/http';
import { resumeOf } from '@/lib/api/application-form';
import { adminCreateInterviewCandidate as contract } from '@/lib/api/contracts';
import type { AdminActor } from '@/lib/auth/admin';
import { BadRequestError } from '@/lib/errors';
import { CONTENT_TYPES, FILE_RULES } from '@/lib/files';
import { objectPath, objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/** The fields and an optional résumé: the largest request this can be. */
const MAX_BYTES = FILE_RULES.RESUME.maxBytes + 1024 * 1024;

/**
 * POST /admin/interview-candidates: JSON, or multipart/form-data with the same
 * JSON in `data` and an optional `resume` (checked as an application's). The
 * résumé goes to storage first and is removed again if the insert fails.
 */
export async function createInterviewCandidate(request: Request, actor: AdminActor): Promise<{ id: string }> {
  let input;
  let resume: Awaited<ReturnType<typeof resumeOf>> = null;
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) {
      throw new BadRequestError('The résumé is too large.', [{ path: 'resume', message: 'larger than 5 MB' }]);
    }
    let parts: FormData;
    let raw: unknown;
    try {
      parts = await request.formData();
      raw = JSON.parse(String(parts.get('data') ?? ''));
    } catch {
      throw new BadRequestError('Send JSON, or multipart/form-data with the JSON in `data`.');
    }
    input = parseValue(request, contract.body.schema, raw);
    resume = await resumeOf(parts.get('resume'));
  } else {
    input = await parseBody(request, contract.body.schema);
  }

  const objects = objectStore();
  const stored = resume && {
    path: objectPath(`candidates/${crypto.randomUUID()}`, 'RESUME', 0, resume.type),
    name: resume.name,
    type: CONTENT_TYPES[resume.type],
  };
  return (async () => {
    if (resume && stored) await objects.put(stored.path, resume.bytes, stored.type);
    return store().interviewCandidates.create(
      { ...input, resume: stored },
      { email: actor.email, name: actor.name || null },
    );
  })().catch(async (error: unknown) => {
    if (stored) await objects.remove([stored.path]).catch(() => {});
    throw error;
  });
}
