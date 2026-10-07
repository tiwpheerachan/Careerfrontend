import 'server-only';
import { clientIp } from '@/lib/api/client-ip';
import { parseBody } from '@/lib/api/http';
import { verifyTurnstile } from '@/lib/api/turnstile';
import { submitApplicationForm as contract } from '@/lib/api/contracts';
import { BadRequestError, TooManyRequestsError } from '@/lib/errors';
import type { Logger } from '@/lib/log';
import { store } from '@/lib/store';

/** 5 forms per 10 minutes per IP — the same allowance as applications. */
const FORM_LIMIT = { windowMs: 10 * 60 * 1000, limit: 5 };

/**
 * POST /application-forms, start to finish: rate limit, the form, Turnstile,
 * the job (when one was chosen), then one insert.
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

  const form = await parseBody(request, contract.body.schema);
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
  const saved = await repos.applicationForms.create({
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
  });
  log.info({ applicationFormId: saved.id, letterhead, job: form.jobCode }, 'application form received');
  return saved;
}
