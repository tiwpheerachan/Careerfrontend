import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as candidates from '@/app/api/v1/admin/interview-candidates/route';
import * as one from '@/app/api/v1/admin/interview-evaluations/[id]/route';
import * as evaluations from '@/app/api/v1/admin/interview-evaluations/route';
import { ApplicationFormInput } from '@/lib/application-form/schema';
import { resetPermissionsCache } from '@/lib/auth/permissions';
import { seal, SESSION_COOKIE } from '@/lib/auth/session';
import { resetServerEnv } from '@/lib/env';
import { call } from '@/tests/support/api';
import { applicationFormInput } from '@/tests/support/application-form';
import { applicationInput, openJob, repos } from '@/tests/support/fixtures';

const scores = (n: number, length = 10) => Array(length).fill(n) as number[];

const evaluation = (overrides: Record<string, unknown> = {}) => ({
  candidateName: 'Somchai Jaidee',
  position: 'หัวหน้าทีม CS',
  department: 'Operations',
  interviewDate: '2026-10-07',
  round: 1,
  evaluatorRole: 'HR',
  senior: false,
  generalScores: scores(4),
  result: 'PASS',
  comment: 'สื่อสารดี',
  ...overrides,
});

const post = (body: unknown, headers?: Record<string, string>) => call(evaluations.POST, { json: body, headers });

async function anApplication() {
  const { pk } = await openJob();
  return repos.applications.create(pk, applicationInput());
}

describe('picking the candidate', () => {
  it('finds applicants and application forms by name, newest first', async () => {
    const application = await anApplication();
    const form = await repos.applicationForms.create({
      locale: 'th',
      letterhead: 'SHD',
      jobsPk: null,
      position: 'พนักงานขาย',
      nameTh: 'Somchai Formfill',
      nameEn: null,
      email: 'f@example.com',
      mobile: '0811111111',
      answers: (() => {
        const {
          locale: _l,
          letterhead: _h,
          jobCode: _j,
          positionOther: _p,
          sensitiveConsent: _c,
          sensitive: _s,
          certified: _x,
          turnstileToken: _t,
          ...answers
        } = ApplicationFormInput.parse(applicationFormInput());
        return answers;
      })(),
      sensitive: null,
    });
    const res = await call(candidates.GET, { query: { q: 'somchai' } });
    expect(res.status).toBe(200);
    expect(res.body.candidates).toEqual([
      expect.objectContaining({ kind: 'form', id: form.id, name: 'Somchai Formfill', position: 'พนักงานขาย' }),
      expect.objectContaining({
        kind: 'application',
        id: application.id,
        name: 'Somchai Jaidee',
        position: 'หัวหน้าทีม CS',
        department: 'Operations',
      }),
    ]);
  });
});

describe('evaluating', () => {
  it('saves one round for an applicant, with the totals and the pass mark', async () => {
    const application = await anApplication();
    const res = await post(evaluation({ applicationId: application.id }));
    expect(res.status).toBe(201);
    expect(res.body.evaluation).toMatchObject({
      candidate: { kind: 'application', id: application.id, name: 'Somchai Jaidee' },
      round: 1,
      evaluatorRole: 'HR',
      evaluator: { email: 'dev@localhost' },
      generalTotal: 40,
      seniorTotal: null,
      total: 40,
      max: 50,
      meetsPassMark: true,
      result: 'PASS',
      failReason: null,
    });
  });

  it('a Senior position scores 15 items; exactly 20 on items 11–15 does not meet the mark', async () => {
    const res = await post(evaluation({ senior: true, generalScores: scores(5), seniorScores: scores(4, 5) }));
    expect(res.body.evaluation).toMatchObject({
      candidate: { kind: 'manual', id: null },
      generalTotal: 50,
      seniorTotal: 20,
      total: 70,
      max: 75,
      meetsPassMark: false,
    });
  });

  it('keeps a fail reason only with a FAIL', async () => {
    const pass = await post(evaluation({ result: 'PASS', failReason: 'ignored' }));
    const fail = await post(evaluation({ result: 'FAIL', failReason: 'ประสบการณ์ไม่ตรง' }));
    expect(pass.body.evaluation.failReason).toBeNull();
    expect(fail.body.evaluation.failReason).toBe('ประสบการณ์ไม่ตรง');
  });

  it('400: wrong number of scores, a score out of 0–5, Senior without items 11–15, two links', async () => {
    const cases = [
      [evaluation({ generalScores: scores(4, 9) }), 'generalScores'],
      [evaluation({ generalScores: [...scores(4, 9), 6] }), 'generalScores.9'],
      [evaluation({ senior: true }), 'seniorScores'],
      [evaluation({ seniorScores: scores(4, 5) }), 'seniorScores'],
      [evaluation({ applicationId: crypto.randomUUID(), applicationFormId: crypto.randomUUID() }), 'applicationFormId'],
      [evaluation({ round: 3 }), 'round'],
    ] as const;
    for (const [body, path] of cases) {
      const res = await post(body);
      expect(res.status, path).toBe(400);
      expect(res.body.error.issues.map((i: { path: string }) => i.path)).toContain(path);
    }
  });

  it('400 for an applicant that does not exist', async () => {
    const res = await post(evaluation({ applicationId: crypto.randomUUID() }));
    expect(res.status).toBe(400);
    expect(res.body.error.issues[0].path).toBe('applicationId');
  });

  it('list (newest interview first), search, get, change, delete', async () => {
    await post(evaluation({ candidateName: 'Earlier', interviewDate: '2026-10-01' }));
    const { body } = await post(evaluation({ candidateName: 'Later', interviewDate: '2026-10-05', round: 2 }));
    const id = body.evaluation.id;

    const list = await call(evaluations.GET);
    expect(list.body.evaluations.map((e: { candidate: { name: string } }) => e.candidate.name)).toEqual([
      'Later',
      'Earlier',
    ]);
    expect((await call(evaluations.GET, { query: { q: 'earl' } })).body.total).toBe(1);
    expect((await call(one.GET, { params: { id } })).body.evaluation.round).toBe(2);

    const changed = await call(one.PUT, {
      method: 'PUT',
      params: { id },
      json: evaluation({ candidateName: 'Later', round: 2, generalScores: scores(3), result: 'FAIL', failReason: 'x' }),
    });
    expect(changed.body.evaluation).toMatchObject({ generalTotal: 30, meetsPassMark: false, result: 'FAIL' });

    expect((await call(one.DELETE, { method: 'DELETE', params: { id } })).status).toBe(204);
    expect((await call(one.GET, { params: { id } })).status).toBe(404);
  });
});

describe('with SSO on: an evaluation is its evaluator’s', () => {
  const SECRET = 'a-test-session-secret-0123456789abcdef';
  const as = async (email: string) => ({
    cookie: `${SESSION_COOKIE}=${await seal({ sub: email, name: email.split('@')[0]!, email }, SECRET)}`,
  });
  /** The central system: everyone gets `level` on applications. */
  const grant = (level: 'view' | 'edit' | 'manage') =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ hasAccess: true, resources: { applications: level } }))),
    );

  beforeEach(() => {
    vi.stubEnv('SSO_CLIENT_ID', 'careers');
    vi.stubEnv('SSO_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('CENTRAL_API_KEY', 'central-key');
    resetServerEnv();
    resetPermissionsCache();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetServerEnv();
    resetPermissionsCache();
  });

  it('the evaluator is the signed-in person; others with edit cannot change it, manage can', async () => {
    grant('edit');
    const mine = await post(evaluation({ evaluatorRole: 'DEPARTMENT' }), await as('head@shd-technology.co.th'));
    expect(mine.status).toBe(201);
    expect(mine.body.evaluation.evaluator).toEqual({ email: 'head@shd-technology.co.th', name: 'head' });
    const id = mine.body.evaluation.id;

    const put = (headers: Record<string, string>) =>
      call(one.PUT, { method: 'PUT', params: { id }, json: evaluation({ generalScores: scores(5) }), headers });
    expect((await put(await as('other@shd-technology.co.th'))).status).toBe(403);
    expect((await put(await as('HEAD@shd-technology.co.th'))).status).toBe(200);

    resetPermissionsCache();
    grant('manage');
    expect((await put(await as('hr-lead@shd-technology.co.th'))).status).toBe(200);
  });

  it('view can read but not evaluate; edit cannot delete', async () => {
    grant('view');
    const viewer = await as('viewer@shd-technology.co.th');
    expect((await call(evaluations.GET, { headers: viewer })).status).toBe(200);
    expect((await post(evaluation(), viewer)).status).toBe(403);

    resetPermissionsCache();
    grant('edit');
    const editor = await as('editor@shd-technology.co.th');
    const { body } = await post(evaluation(), editor);
    expect(
      (await call(one.DELETE, { method: 'DELETE', params: { id: body.evaluation.id }, headers: editor })).status,
    ).toBe(403);
  });
});
