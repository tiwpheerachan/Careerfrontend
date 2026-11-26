import 'server-only';
import { clientIp } from '@/lib/api/client-ip';
import { PDFDocument } from 'pdf-lib';
import { parseBody, parseValue, readFormData } from '@/lib/api/http';
import { submissionIdOf } from '@/lib/api/submission';
import { verifyTurnstile } from '@/lib/api/turnstile';
import { submitApplicationForm as contract } from '@/lib/api/contracts';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '@/lib/errors';
import { CONTENT_TYPES, FILE_RULES, cleanFileName, safePng, sniff, type FileType } from '@/lib/files';
import type { Logger } from '@/lib/log';
import { objectPath, objectStore } from '@/lib/storage';
import { store } from '@/lib/store';
import { TURNSTILE_HEADER } from '@/lib/submission-headers';

/** 5 forms per 10 minutes per IP — the same allowance as applications. */
const FORM_LIMIT = { windowMs: 10 * 60 * 1000, limit: 5 };

/** The applicant's photo, for the form's photo box. The wizard sends a 640×800 JPEG it has already made. */
const PHOTO_RULE = { types: ['jpg', 'png'] as FileType[], maxBytes: 5 * 1024 * 1024 };

/** The form's fields, an optional résumé/CV and a photo: the largest request a form can be. */
const MAX_FORM_BYTES = FILE_RULES.RESUME.maxBytes + PHOTO_RULE.maxBytes + 1024 * 1024;

/**
 * The body: JSON, or multipart/form-data with `data` (the same JSON), an
 * optional `resume` file and an optional `photo`. Each file is checked as an
 * application's are: its size, then its type read from its bytes.
 */
async function bodyOf(request: Request) {
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return { form: await parseBody(request, contract.body.schema), resume: null, photo: null };
  }
  const invalid = 'Send the form as JSON, or multipart/form-data with the JSON in `data`.';
  const parts = await readFormData(request, MAX_FORM_BYTES, 'The files are too large altogether.', invalid);
  let raw: unknown;
  try {
    raw = JSON.parse(String(parts.get('data') ?? ''));
  } catch {
    throw new BadRequestError(invalid);
  }
  const form = parseValue(request, contract.body.schema, raw);
  return { form, resume: await resumeOf(parts.get('resume')), photo: await photoOf(parts.get('photo')) };
}

/** A résumé/CV part, checked as an application's is: size, then its type from its bytes. Null for none. */
export async function resumeOf(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
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
  return { name: cleanFileName(file.name), bytes, type };
}

async function photoOf(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > PHOTO_RULE.maxBytes) {
    throw new BadRequestError('The photo is too large.', [{ path: 'photo', message: 'larger than 5 MB' }]);
  }
  const sent = new Uint8Array(await file.arrayBuffer());
  const type = sniff(sent);
  const bytes = type === 'png' ? safePng(sent) : sent;
  if (!bytes) {
    throw new BadRequestError('The photo cannot be used.', [
      { path: 'photo', message: 'must be a JPG or a smaller PNG' },
    ]);
  }
  // Opened as the PDF will open it: a file that only starts like an image would break every print of the form.
  const opens = async () => {
    const doc = await PDFDocument.create();
    return (type === 'png' ? doc.embedPng(bytes) : doc.embedJpg(bytes)).then(
      () => true,
      () => false,
    );
  };
  if (!type || !PHOTO_RULE.types.includes(type) || !(await opens())) {
    throw new BadRequestError('The photo must be a JPG or PNG image.', [
      { path: 'photo', message: 'must be JPG or PNG' },
    ]);
  }
  return { bytes, type };
}

/**
 * The form's photo for its PDF, or null: none sent, its object gone from
 * storage, or not safe to decode (stored before safePng) — the form still prints, with the box empty.
 */
export async function photoOfForm(form: { photoPath: string | null; photoType: string | null }) {
  if (!form.photoPath || !form.photoType) return null;
  const bytes = await objectStore()
    .read(form.photoPath)
    .catch((error: unknown) => {
      if (error instanceof NotFoundError) return null;
      throw error;
    });
  const png = form.photoType === CONTENT_TYPES.png;
  const safe = bytes && png ? safePng(bytes) : bytes;
  return safe && { bytes: safe, png };
}

/**
 * POST /application-forms, start to finish: rate limit, Turnstile (from its
 * header, before any file is read), the form (and its résumé and photo, if they
 * came), the job (when one was chosen),
 * the files into storage, then one insert — the files removed again if that fails.
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

  const token = request.headers.get(TURNSTILE_HEADER) ?? undefined;
  const multipart = request.headers.get('content-type')?.includes('multipart/form-data');
  if (multipart || token) await verifyTurnstile(token, ip);
  const { form, resume, photo } = await bodyOf(request);
  // Plain JSON is small enough to read first, and may carry the token itself.
  if (!multipart && !token) await verifyTurnstile(form.turnstileToken, ip);

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
  // One random folder for the form's files.
  const folder = `forms/${crypto.randomUUID()}`;
  const stored = resume && {
    path: objectPath(folder, 'RESUME', 0, resume.type),
    name: resume.name,
    type: CONTENT_TYPES[resume.type],
  };
  const storedPhoto = photo && { path: objectPath(folder, 'PHOTO', 0, photo.type), type: CONTENT_TYPES[photo.type] };
  const written = [stored?.path, storedPhoto?.path].filter((p): p is string => Boolean(p));
  const cleanUp = () =>
    objects.remove(written).catch((err) => log.error({ err, folder }, 'application form: cleanup failed'));
  // The files, then one insert — the files removed again if anything fails.
  const { repeated, ...saved } = await (async () => {
    if (resume && stored) await objects.put(stored.path, resume.bytes, stored.type);
    if (photo && storedPhoto) await objects.put(storedPhoto.path, photo.bytes, storedPhoto.type);
    return repos.applicationForms.create({
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
      photo: storedPhoto,
      submissionId: submissionIdOf(request),
    });
  })().catch(async (error: unknown) => {
    if (written.length) await cleanUp();
    throw error;
  });
  if (repeated) {
    if (written.length) await cleanUp();
    log.info({ applicationFormId: saved.id }, 'application form sent again');
    return saved;
  }
  log.info(
    {
      applicationFormId: saved.id,
      letterhead,
      job: form.jobCode,
      resume: Boolean(stored),
      photo: Boolean(storedPhoto),
    },
    'application form received',
  );
  return saved;
}
