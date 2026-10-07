import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as invitationsRoute from '@/app/api/v1/admin/interview-invitations/route';
import * as revokeRoute from '@/app/api/v1/admin/interview-invitations/[id]/route';
import * as people from '@/app/api/v1/admin/people/route';
import * as formPdf from '@/app/api/v1/evaluate/[token]/application-form/route';
import * as files from '@/app/api/v1/evaluate/[token]/files/[fileId]/route';
import * as evaluate from '@/app/api/v1/evaluate/[token]/route';
import { resetPermissionsCache } from '@/lib/auth/permissions';
import { seal, SESSION_COOKIE } from '@/lib/auth/session';
import { resetServerEnv } from '@/lib/env';
import { call } from '@/tests/support/api';
import { applicationInput, openJob, repos } from '@/tests/support/fixtures';

const SECRET = 'a-test-session-secret-0123456789abcdef';
const as = async (email: string) => ({
  cookie: `${SESSION_COOKIE}=${await seal({ sub: email, name: email.split('@')[0]!, email }, SECRET)}`,
});

const scores = (n: number, length = 10) => Array(length).fill(n) as number[];
const evaluation = (overrides: Record<string, unknown> = {}) => ({
  senior: false,
  generalScores: scores(4),
  result: 'PASS',
  comment: 'ดี',
  ...overrides,
});

async function anApplication() {
  const { pk } = await openJob();
  return repos.applications.create(pk, applicationInput());
}

const invite = (applicationId: string, invitees = ['head@shd-technology.co.th', 'lead@shd-technology.co.th']) => ({
  applicationId,
  candidateName: 'Somchai Jaidee',
  position: 'หัวหน้าทีม CS',
  department: 'Operations',
  round: 1,
  evaluatorRole: 'DEPARTMENT',
  invitees: invitees.map((email) => ({ email, name: email.split('@')[0] })),
});

const tokenOf = (link: string) => link.split('/evaluate/')[1]!;

describe('the company directory', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('503 without CENTRAL_API_KEY', async () => {
    const res = await call(people.GET, { query: { q: 'som' } });
    expect(res.status).toBe(503);
  });

  it('asks the central directory, keeps only people with an email, never shows the key', async () => {
    vi.stubEnv('CENTRAL_API_KEY', 'central-key');
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            items: [
              {
                union_id: 'u1',
                name: 'สมศรี',
                en_name: 'Somsri',
                email: 'Somsri@SHD.co.th',
                job_title: 'Manager',
                departments: ['HR'],
              },
              { union_id: 'u2', name: 'No Mail', email: '' },
            ],
          }),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const res = await call(people.GET, { query: { q: 'som' } });
    expect(res.body.people).toEqual([
      {
        unionId: 'u1',
        name: 'สมศรี',
        enName: 'Somsri',
        email: 'somsri@shd.co.th',
        jobTitle: 'Manager',
        department: 'HR',
      },
    ]);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/directory\/search\?q=som&limit=20$/);
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer central-key');
    expect(JSON.stringify(res.body)).not.toContain('central-key');
  });
});

describe('invitation links', () => {
  let centralCalls: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv('SSO_CLIENT_ID', 'careers');
    vi.stubEnv('SSO_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('SESSION_SECRET', SECRET);
    vi.stubEnv('CENTRAL_API_KEY', 'central-key');
    resetServerEnv();
    resetPermissionsCache();
    // HR has manage on applicants; nobody else has anything.
    centralCalls = vi.fn(async (_url: string, init: RequestInit) => {
      const who = JSON.parse(String(init.body)).user as string;
      const body =
        who === 'hr@shd-technology.co.th'
          ? { hasAccess: true, resources: { applications: 'manage' } }
          : { hasAccess: false };
      return new Response(JSON.stringify(body));
    });
    vi.stubGlobal('fetch', centralCalls);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetServerEnv();
    resetPermissionsCache();
  });

  async function made(applicationId: string, invitees?: string[]) {
    const res = await call(invitationsRoute.POST, {
      json: invite(applicationId, invitees),
      headers: await as('hr@shd-technology.co.th'),
    });
    expect(res.status).toBe(201);
    return res.body.invitation;
  }

  it('HR makes one link for the people chosen', async () => {
    const application = await anApplication();
    const invitation = await made(application.id);
    expect(invitation).toMatchObject({
      state: 'PENDING',
      round: 1,
      evaluatorRole: 'DEPARTMENT',
      createdBy: 'hr@shd-technology.co.th',
      candidate: { kind: 'application', id: application.id, name: 'Somchai Jaidee' },
    });
    expect(invitation.link).toMatch(/\/evaluate\/[A-Za-z0-9_-]{43}$/);
    expect(invitation.invitees.map((p: { email: string }) => p.email)).toEqual([
      'head@shd-technology.co.th',
      'lead@shd-technology.co.th',
    ]);
  });

  it('someone on it with NO role sends once — the central role system is not asked', async () => {
    const application = await anApplication();
    const token = tokenOf((await made(application.id)).link);
    centralCalls.mockClear();

    const sent = await call(evaluate.POST, {
      path: `/api/v1/evaluate/${token}`,
      params: { token },
      json: evaluation(),
      headers: await as('head@shd-technology.co.th'),
    });
    expect(sent.status).toBe(201);
    expect(centralCalls).not.toHaveBeenCalled();

    const again = await call(evaluate.POST, {
      params: { token },
      json: evaluation(),
      headers: await as('head@shd-technology.co.th'),
    });
    expect(again.status).toBe(409);

    const [saved] = await repos.interviewEvaluations.forCandidate({ kind: 'application', id: application.id });
    expect(saved).toMatchObject({
      round: 1,
      evaluatorRole: 'DEPARTMENT',
      evaluator: { email: 'head@shd-technology.co.th' },
      total: 40,
    });
    const [inv] = await repos.interviewInvitations.forCandidate({ kind: 'application', id: application.id });
    expect(inv!.invitees.find((p) => p.email === 'head@shd-technology.co.th')!.submittedAt).toBeInstanceOf(Date);
    expect(inv!.state).toBe('PENDING'); // the other person has not sent yet
    expect(saved).toMatchObject({ viaInvitation: true, edited: null });
  });

  it('HR sets Senior on the link; the invitee cannot change it', async () => {
    const application = await anApplication();
    const res = await call(invitationsRoute.POST, {
      json: { ...invite(application.id), senior: true },
      headers: await as('hr@shd-technology.co.th'),
    });
    expect(res.body.invitation).toMatchObject({ senior: true, createdByName: 'hr' });
    const token = tokenOf(res.body.invitation.link);
    const send = async (body: unknown) =>
      call(evaluate.POST, { params: { token }, json: body, headers: await as('head@shd-technology.co.th') });

    expect((await send(evaluation())).status).toBe(400);
    const sent = await send(evaluation({ senior: true, seniorScores: scores(5, 5) }));
    expect(sent.status).toBe(201);
    expect(await repos.interviewEvaluations.get(sent.body.evaluationId)).toMatchObject({ senior: true, total: 65 });
  });

  it('401 signed out; 403 for someone not on it, whatever their role (HR included)', async () => {
    const application = await anApplication();
    const token = tokenOf((await made(application.id)).link);
    expect((await call(evaluate.POST, { params: { token }, json: evaluation() })).status).toBe(401);
    expect(
      (
        await call(evaluate.POST, {
          params: { token },
          json: evaluation(),
          headers: await as('stranger@shd-technology.co.th'),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call(evaluate.POST, {
          params: { token },
          json: evaluation(),
          headers: await as('hr@shd-technology.co.th'),
        })
      ).status,
    ).toBe(403);
  });

  it('24 hours unopened; 6 hours from the first opening; then 410', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const t0 = new Date('2026-10-07T09:00:00+07:00');
    vi.setSystemTime(t0);
    const application = await anApplication();
    const token = tokenOf((await made(application.id)).link);

    vi.setSystemTime(new Date(t0.getTime() + 20 * 3600_000));
    await repos.interviewInvitations.markOpened(token, 'lead@shd-technology.co.th');
    vi.setSystemTime(new Date(t0.getTime() + 25.9 * 3600_000)); // past the first day, inside the 6 hours
    expect(
      (
        await call(evaluate.POST, {
          params: { token },
          json: evaluation(),
          headers: await as('head@shd-technology.co.th'),
        })
      ).status,
    ).toBe(201);
    vi.setSystemTime(new Date(t0.getTime() + 26.1 * 3600_000));
    expect(
      (
        await call(evaluate.POST, {
          params: { token },
          json: evaluation(),
          headers: await as('lead@shd-technology.co.th'),
        })
      ).status,
    ).toBe(410);
  });

  it('switched off: 410, and it shows as revoked', async () => {
    const application = await anApplication();
    const invitation = await made(application.id);
    const hr = await as('hr@shd-technology.co.th');
    expect(
      (await call(revokeRoute.DELETE, { method: 'DELETE', params: { id: invitation.id }, headers: hr })).status,
    ).toBe(204);
    const token = tokenOf(invitation.link);
    expect(
      (
        await call(evaluate.POST, {
          params: { token },
          json: evaluation(),
          headers: await as('head@shd-technology.co.th'),
        })
      ).status,
    ).toBe(410);
    const list = await call(invitationsRoute.GET, {
      query: { candidate: `application:${application.id}` },
      headers: hr,
    });
    expect(list.body.invitations[0].state).toBe('REVOKED');
  });

  it('files: only the applicant the link is for; the application-form PDF only for a form', async () => {
    const application = await anApplication();
    const other = await repos.applications.create((await openJob({ code: 'SHD-TH-OPS-002' })).pk, applicationInput());
    const token = tokenOf((await made(application.id)).link);
    const otherFile = (await repos.applications.get(other.id)).files[0]!;
    const headers = await as('head@shd-technology.co.th');
    expect((await call(files.GET, { params: { token, fileId: otherFile.id }, headers })).status).toBe(404);
    expect((await call(formPdf.GET, { params: { token }, headers })).status).toBe(404);
  });

  it('400 without anyone to invite, or the same person twice', async () => {
    const application = await anApplication();
    const hr = await as('hr@shd-technology.co.th');
    expect((await call(invitationsRoute.POST, { json: invite(application.id, []), headers: hr })).status).toBe(400);
    expect(
      (await call(invitationsRoute.POST, { json: invite(application.id, ['a@shd.co.th', 'A@SHD.co.th']), headers: hr }))
        .status,
    ).toBe(400);
  });
});
