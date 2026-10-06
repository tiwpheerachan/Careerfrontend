import 'server-only';
import { afterResponse } from '@/lib/api/after';
import { clientIp } from '@/lib/api/client-ip';
import { pushToApplySheet } from '@/lib/api/apply-sheet';
import { errorMapFor, validationLanguage } from '@/lib/api/http';
import { ApplicationFields } from '@/lib/api/schemas';
import { verifyTurnstile } from '@/lib/api/turnstile';
import type { ApplicationFileKind } from '@/lib/db/schema';
import { BadRequestError, NotFoundError, TooManyRequestsError } from '@/lib/errors';
import { CONTENT_TYPES, FILE_RULES, MAX_APPLICATION_BYTES, cleanFileName, sniff } from '@/lib/files';
import type { Logger } from '@/lib/log';
import type { ApplicationFileInput } from '@/lib/repositories/applications';
import { objectPath, objectStore } from '@/lib/storage';
import { store } from '@/lib/store';

/** 5 applications per 10 minutes per IP. Generous for a person, slow for a script. */
const APPLY_LIMIT = { windowMs: 10 * 60 * 1000, limit: 5 };

interface Issue {
  path: string;
  message: string;
}

/** The uploaded files, by kind; an empty file input (no file chosen) is not a file. */
function filesOf(form: FormData): Record<ApplicationFileKind, File[]> {
  const files = (name: string) =>
    form.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
  return { RESUME: files('resume'), TRANSCRIPT: files('transcript'), ATTACHMENT: files('attachments') };
}

/** Checks every file against its kind's rules, reading its type from its bytes. */
async function checkFiles(files: Record<ApplicationFileKind, File[]>) {
  const issues: Issue[] = [];
  const accepted: Array<{
    kind: ApplicationFileKind;
    file: File;
    bytes: Uint8Array;
    type: keyof typeof CONTENT_TYPES;
  }> = [];
  const field = { RESUME: 'resume', TRANSCRIPT: 'transcript', ATTACHMENT: 'attachments' } as const;

  if (files.RESUME.length === 0) issues.push({ path: 'resume', message: 'a résumé is required' });

  for (const kind of Object.keys(FILE_RULES) as ApplicationFileKind[]) {
    const rule = FILE_RULES[kind];
    if (files[kind].length > rule.maxCount) {
      issues.push({ path: field[kind], message: `at most ${rule.maxCount} file(s)` });
      continue;
    }
    for (const [i, file] of files[kind].entries()) {
      const path = rule.maxCount > 1 ? `${field[kind]}.${i}` : field[kind];
      if (file.size > rule.maxBytes) {
        issues.push({ path, message: `${cleanFileName(file.name)} is larger than ${rule.maxBytes / 1024 / 1024} MB` });
        continue;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniff(bytes);
      if (!type || !rule.types.includes(type)) {
        issues.push({
          path,
          message: `${cleanFileName(file.name)} is not an allowed file (${rule.types.join(', ').toUpperCase()})`,
        });
        continue;
      }
      accepted.push({ kind, file, bytes, type });
    }
  }
  return { issues, accepted };
}

/** Text fields as strings; anything sent as a file under a text name is ignored. */
function fieldsOf(form: FormData): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of Object.keys(ApplicationFields.shape)) {
    const value = form.get(key);
    if (typeof value === 'string') fields[key] = value;
  }
  const turnstile = form.get('cf-turnstile-response');
  if (!fields.turnstileToken && typeof turnstile === 'string') fields.turnstileToken = turnstile;
  return fields;
}

/**
 * POST /jobs/{code}/applications, start to finish. The order is cheapest
 * refusal first: rate limit, size, job, fields, Turnstile, files — and only
 * then the uploads and the one database transaction. If the transaction
 * fails, the files just uploaded are removed again.
 */
export async function submitApplication(request: Request, code: string, log: Logger): Promise<{ id: string }> {
  const repos = store();

  const ip = clientIp(request);
  if (ip) {
    const verdict = await repos.rateLimits.hit(`apply:ip:${ip}`, APPLY_LIMIT);
    if (!verdict.allowed) throw new TooManyRequestsError(verdict.retryAfter);
  } else {
    log.warn('apply: no client IP (TRUST_PROXY_HEADER unset?) — rate limit skipped');
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_APPLICATION_BYTES) throw new BadRequestError('The files are too large altogether.');

  const job = await repos.jobs.getPublic(code, 'th');
  const jobsPk = job && (await repos.jobs.openJobPk(code));
  if (!job || !jobsPk) throw new NotFoundError('job', code);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new BadRequestError('Send the application as multipart/form-data.');
  }

  const raw = fieldsOf(form);
  // Field messages in the language the form was filled in.
  const parsed = ApplicationFields.safeParse(raw, { error: errorMapFor(validationLanguage(request, raw.locale)) });
  const { issues: fileIssues, accepted } = await checkFiles(filesOf(form));
  const issues: Issue[] = [
    ...(parsed.success ? [] : parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))),
    ...fileIssues,
  ];
  if (!parsed.success || issues.length) throw new BadRequestError('The application is not complete.', issues);
  const fields = parsed.data;

  await verifyTurnstile(fields.turnstileToken, ip);

  // Upload, then save. Every path is new, under one random folder.
  const objects = objectStore();
  const folder = crypto.randomUUID();
  const counters: Record<ApplicationFileKind, number> = { RESUME: 0, TRANSCRIPT: 0, ATTACHMENT: 0 };
  const files: ApplicationFileInput[] = [];
  try {
    for (const { kind, file, bytes, type } of accepted) {
      const storagePath = objectPath(folder, kind, counters[kind]++, type);
      await objects.put(storagePath, bytes, CONTENT_TYPES[type]);
      files.push({
        kind,
        storagePath,
        fileName: cleanFileName(file.name),
        contentType: CONTENT_TYPES[type],
        sizeBytes: bytes.byteLength,
      });
    }

    const { turnstileToken: _token, termsAccepted: _terms, ...rest } = fields;
    const input = { ...rest, files };
    const saved = await repos.applications.create(jobsPk, input);

    afterResponse(() => pushToApplySheet({ id: saved.id, jobCode: job.code, jobTitle: job.title, input }, log));
    log.info({ applicationId: saved.id, job: job.code, files: files.length }, 'application received');
    return saved;
  } catch (error) {
    await objects
      .remove(files.map((f) => f.storagePath))
      .catch((err) => log.error({ err, folder }, 'apply: cleanup failed'));
    throw error;
  }
}
