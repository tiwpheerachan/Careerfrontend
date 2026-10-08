import 'server-only';
import { clientIp } from '@/lib/api/client-ip';
import { parseBody, parseValue } from '@/lib/api/http';
import { verifyTurnstile } from '@/lib/api/turnstile';
import { submitApplicationForm as contract } from '@/lib/api/contracts';
import { BadRequestError, TooManyRequestsError } from '@/lib/errors';
import { CONTENT_TYPES, FILE_RULES, cleanFileName, sniff } from '@/lib/files';
import type { Logger } from '@/lib/log';
import { objectPath, objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/** 5 forms per 10 minutes per IP — the same allowance as applications. */
const FORM_LIMIT = { windowMs: 10 * 60 * 1000, limit: 5 };

/** The form's fields and an optional résumé/CV: the largest request a form can be. */
const MAX_FORM_BYTES = FILE_RULES.RESUME.maxBytes + 1024 * 1024;

/**
 * The body: JSON, or multipart/form-data with `data` (the same JSON) and an
 * optional `resume` file. The file is checked as an application's résumé is:
 * its size, then its type read from its bytes.
 */
async function bodyOf(request: Request) {
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return { form: await parseBody(request, contract.body.schema), resume: null };
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_FORM_BYTES) {
    throw new BadRequestError('The résumé is too large.', [{ path: 'resume', message: 'larger than 5 MB' }]);
  }
  let parts: FormData;
  let raw: unknown;
  try {
    parts = await request.formData();
    raw = JSON.parse(String(parts.get('data') ?? ''));
  } catch {
    throw new BadRequestError('Send the form as JSON, or multipart/form-data with the JSON in `data`.');
  }
  const form = parseValue(request, contract.body.schema, raw);
  const file = parts.get('resume');
  if (!(file instanceof File) || file.size === 0) return { form, resume: null };
  if (file.size > FILE_RULES.RESUME.maxBytes) {
    throw new BadRequestError('The résumé is too large.', [{ path: 'resume', message: 'larger than 5 MB' }]);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type || !FILE_RULES.RESUME.types.includes(type)) {
    throw new BadRequestError('The résumé must be a PDF or Word file.', [
      { path: 'resume', message: 'must be PDF, DOC or DOCX' },
    ]);
  }
  return { form, resume: { name: cleanFileName(file.name), bytes, type } };
}

/**
 * POST /application-forms, start to finish: rate limit, the form (and its
 * résumé, if one came), Turnstile, the job (when one was chosen), the résumé
 * into storage, then one insert — the résumé removed again if that fails.
 *
 * The sensitive part (PDPA s.26) is dropped unless its own consent box was
 * ticked — whatever the browser sent.
 */
export async function submitApplicationForm(request: Request, log: Logger): Promise<{ id: string }> {
  const repos = store();

  const ip = clientIp(request);
  if (ip) {
    const verdict = await repos.rateLimits.hit(`form:ip:${ip}`, FORM_LIMIT);
    if (!verdict.allowed) throw new TooManyRequestsError(verdict.retryAfter);
  } else {
    log.warn('application form: no client IP (TRUST_PROXY_HEADER unset?) — rate limit skipped');
  }

  const { form, resume } = await bodyOf(request);
  await verifyTurnstile(form.turnstileToken, ip);

  let jobsPk: number | null = null;
  let position = form.positionOther;
  if (form.jobCode) {
    const job = await repos.jobs.getPublic(form.jobCode, 'th');
    const pk = job && (await repos.jobs.openJobPk(form.jobCode));
    if (!job || !pk) {
      throw new BadRequestError('The form is not complete.', [
        { path: 'jobCode', message: 'this job is no longer open — choose another or write the position' },
      ]);
    }
    jobsPk = pk;
    position = job.title;
  }

  const {
    locale,
    letterhead,
    jobCode: _job,
    positionOther: _other,
    sensitiveConsent,
    sensitive,
    certified: _certified,
    turnstileToken: _token,
    ...answers
  } = form;
  const objects = objectStore();
  const stored = resume && {
    path: objectPath(`forms/${crypto.randomUUID()}`, 'RESUME', 0, resume.type),
    name: resume.name,
    type: CONTENT_TYPES[resume.type],
  };
  if (resume && stored) await objects.put(stored.path, resume.bytes, stored.type);
  const saved = await repos.applicationForms
    .create({
      locale,
      letterhead,
      jobsPk,
      position: position!,
      nameTh: answers.nameTh,
      nameEn: answers.nameEn,
      email: answers.email,
      mobile: answers.mobile,
      answers,
      sensitive: sensitiveConsent && sensitive && Object.values(sensitive).some((v) => v !== null) ? sensitive : null,
      resume: stored,
    })
    .catch(async (error: unknown) => {
      if (stored) await objects.remove([stored.path]).catch(() => {});
      throw error;
    });
  log.info(
    { applicationFormId: saved.id, letterhead, job: form.jobCode, resume: Boolean(stored) },
    'application form received',
  );
  return saved;
}
