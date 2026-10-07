import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as analytics from '@/app/api/v1/admin/analytics/route';
import * as applicationsExport from '@/app/api/v1/admin/applications/export/route';
import * as note from '@/app/api/v1/admin/applications/[id]/notes/[noteId]/route';
import * as notes from '@/app/api/v1/admin/applications/[id]/notes/route';
import * as stage from '@/app/api/v1/admin/applications/[id]/stage/route';
import * as applications from '@/app/api/v1/admin/applications/route';
import * as content from '@/app/api/v1/admin/content/route';
import * as publicContent from '@/app/api/v1/content/route';
import * as publishState from '@/app/api/v1/admin/jobs/[id]/publish-state/route';
import * as job from '@/app/api/v1/admin/jobs/[id]/route';
import * as jobs from '@/app/api/v1/admin/jobs/route';
import * as openapi from '@/app/api/v1/openapi.json/route';
import { resetPermissionsCache } from '@/lib/auth/permissions';
import { seal, SESSION_COOKIE } from '@/lib/auth/session';
import { resetServerEnv } from '@/lib/env';
import { call } from '@/tests/support/api';
import { applicationInput, jobInput, openJob, repos } from '@/tests/support/fixtures';

const body = {
  code: 'shd-th-new-001',
  countryCode: 'th',
  department: 'Operations',
  level: '',
  quantity: 2,
  translations: { th: { title: 'ตำแหน่งใหม่', location: '', description: 'งาน', qualifications: null } },
};

describe('admin jobs', () => {
  it('create → get → update → publish → delete', async () => {
    const created = await call(jobs.POST, { json: body });
    expect(created.status).toBe(201);
    expect(created.body.job).toMatchObject({
      code: 'SHD-TH-NEW-001',
      countryCode: 'TH',
      publishState: 'DRAFT',
      level: null,
      createdBy: 'dev@localhost',
    });
    expect(created.body.job.translations.th.location).toBeNull();
    const id = created.body.job.id;

    expect((await call(job.GET, { params: { id } })).body.job.id).toBe(id);

    const updated = await call(job.PUT, { method: 'PUT', params: { id }, json: { ...body, quantity: null } });
    expect(updated.body.job.quantity).toBeNull();

    const published = await call(publishState.PATCH, {
      method: 'PATCH',
      params: { id },
      json: { publishState: 'PUBLISHED' },
    });
    expect(published.body.job.publishedAt).toBeTruthy();

    expect((await call(job.DELETE, { method: 'DELETE', params: { id } })).status).toBe(204);
    expect((await call(job.GET, { params: { id } })).status).toBe(404);
  });

  it('409 on a duplicate code; 400 with issues on a bad body; 404 on a malformed id', async () => {
    await call(jobs.POST, { json: body });
    expect((await call(jobs.POST, { json: body })).status).toBe(409);

    const bad = await call(jobs.POST, { json: { ...body, code: 'has space', translations: {} } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.issues.map((i: { path: string }) => i.path).sort()).toEqual(['code', 'translations']);

    expect((await call(job.GET, { params: { id: 'nope' } })).status).toBe(404);
  });
});

describe('admin applications', () => {
  it('list with stage counts; stage change answers with the fresh record', async () => {
    const { pk } = await openJob();
    const { id } = await repos.applications.create(pk, applicationInput());
    await repos.applications.create(pk, applicationInput({ email: 'b@example.com' }));

    const list = await call(applications.GET, { query: { pageSize: '1' } });
    expect(list.body).toMatchObject({ total: 2, page: 1, pageSize: 1, stageCounts: { NEW: 2 } });

    const moved = await call(stage.PATCH, { method: 'PATCH', params: { id }, json: { stage: 'SHORTLISTED' } });
    expect(moved.body.application).toMatchObject({ stage: 'SHORTLISTED', stageChangedBy: 'dev@localhost' });
    expect(moved.body.application.stageHistory).toHaveLength(2);

    expect((await call(stage.PATCH, { method: 'PATCH', params: { id }, json: { stage: 'MAYBE' } })).status).toBe(400);
  });

  it('notes: add and delete', async () => {
    const { pk } = await openJob();
    const { id } = await repos.applications.create(pk, applicationInput());
    const added = await call(notes.POST, { params: { id }, json: { body: '  Call Monday  ' } });
    expect(added.status).toBe(201);
    expect(added.body.note).toMatchObject({ body: 'Call Monday', createdBy: 'dev@localhost' });
    const removed = await call(note.DELETE, { method: 'DELETE', params: { id, noteId: added.body.note.id } });
    expect(removed.status).toBe(204);
  });

  it('CSV export: BOM, Thai intact, formulas neutralised, job filter honoured', async () => {
    const { job: a, pk } = await openJob({ code: 'JOB-A' });
    const other = await openJob({ code: 'JOB-B' });
    await repos.applications.create(pk, applicationInput({ firstName: '=HYPERLINK("http://evil")', lastName: 'ใจดี' }));
    await repos.applications.create(other.pk, applicationInput({ email: 'x@example.com' }));

    const res = await call(applicationsExport.GET, { query: { jobId: a.id } });
    expect(res.headers.get('content-type')).toContain('text/csv');
    const csv = String(res.body);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.trim().split('\r\n')).toHaveLength(2); // header + JOB-A's one applicant
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain('"ใจดี"');
  });

  it('analytics answers', async () => {
    const { pk } = await openJob();
    await repos.applications.create(pk, applicationInput());
    const res = await call(analytics.GET, { query: { days: '7' } });
    expect(res.body.totals.applications).toBe(1);
    expect(res.body.daily).toHaveLength(7);
  });
});

describe('admin content', () => {
  it('set → public sees it → revert → 404 on a second revert', async () => {
    const set = await call(content.PUT, {
      method: 'PUT',
      json: { key: 'home.hero.title', locale: 'th', value: 'สวัสดี' },
    });
    expect(set.status).toBe(204);
    expect((await call(publicContent.GET, { query: { locale: 'th' } })).body.overrides).toEqual({
      'home.hero.title': 'สวัสดี',
    });

    const query = { key: 'home.hero.title', locale: 'th' };
    expect((await call(content.DELETE, { method: 'DELETE', query })).status).toBe(204);
    expect((await call(content.DELETE, { method: 'DELETE', query })).status).toBe(404);
    expect(
      (await call(content.PUT, { method: 'PUT', json: { key: 'bad key', locale: 'th', value: 'x' } })).status,
    ).toBe(400);
  });
});

describe('the admin gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetServerEnv();
  });

  it('is closed in production while SSO is not configured: 503, no data', async () => {
    await repos.jobs.create(jobInput(), null);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('STORAGE_DRIVER', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_placeholder_for_tests');
    resetServerEnv();

    for (const route of [jobs.GET, applications.GET, openapi.GET]) {
      const res = await call(route);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('unavailable');
    }
  });
});

describe('the admin gate with SSO on', () => {
  const SECRET = 'a-test-session-secret-0123456789abcdef';
  const signedIn = async (email = 'hr@shd-technology.co.th') => ({
    cookie: `${SESSION_COOKIE}=${await seal({ sub: 'u-1', name: 'HR', email }, SECRET)}`,
  });
  /** What the central system answers for /authz/effective. */
  const central = (body: unknown, status = 200) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status })),
    );

  beforeEach(() => {
    vi.stubEnv('SSO_CLIENT_ID', 'careers');
    vi.stubEnv('SSO_CLIENT_SECRET', 'client-secret');
    vi.stubEnv('SESSION_SECRET', SECRET);
    resetServerEnv();
    resetPermissionsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetServerEnv();
    resetPermissionsCache();
  });

  it('401 without a session, or with one signed by someone else', async () => {
    expect((await call(jobs.GET)).status).toBe(401);
    const forged = `${SESSION_COOKIE}=${await seal({ sub: 'x', name: '', email: 'x@y' }, `${SECRET}-other`)}`;
    const res = await call(jobs.GET, { headers: { cookie: forged } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  it('signed in, no CENTRAL_API_KEY: everything, and the work is signed with their email', async () => {
    const res = await call(jobs.POST, { json: body, headers: await signedIn() });
    expect(res.status).toBe(201);
    expect(res.body.job.createdBy).toBe('hr@shd-technology.co.th');
  });

  it('each action needs its level: view reads, edit writes, manage deletes and exports', async () => {
    vi.stubEnv('CENTRAL_API_KEY', 'central-key');
    central({ hasAccess: true, base_level: 'none', resources: { jobs: 'view', applications: 'edit' } });
    const headers = await signedIn();

    expect((await call(jobs.GET, { headers })).status).toBe(200);
    const create = await call(jobs.POST, { json: body, headers });
    expect(create.status).toBe(403);
    expect(create.body.error.code).toBe('forbidden');

    expect((await call(applications.GET, { headers })).status).toBe(200);
    expect((await call(applicationsExport.GET, { headers })).status).toBe(403);
    expect((await call(content.GET, { headers })).status).toBe(403);
  });

  it('403 for a person the central system gives nothing', async () => {
    vi.stubEnv('CENTRAL_API_KEY', 'central-key');
    central({ hasAccess: false });
    expect((await call(openapi.GET, { headers: await signedIn() })).status).toBe(403);
  });

  it('503, not 403, when the central system cannot be asked', async () => {
    vi.stubEnv('CENTRAL_API_KEY', 'central-key');
    central({ error: 'down' }, 502);
    const res = await call(jobs.GET, { headers: await signedIn() });
    expect(res.status).toBe(503);
  });
});

describe('validation messages follow the language', () => {
  it('the admin gets Thai by default and English when chosen', async () => {
    const bad = { ...body, quantity: -1 };
    const th = await call(jobs.POST, { json: bad, path: '/api/v1/admin/jobs' });
    const en = await call(jobs.POST, { json: bad, path: '/api/v1/admin/jobs', headers: { cookie: 'admin_locale=en' } });
    const message = (res: Awaited<ReturnType<typeof call>>) =>
      res.body.error.issues.find((i: { path: string }) => i.path === 'quantity').message as string;
    expect(message(th)).toMatch(/[฀-๿]/); // Thai script
    expect(message(en)).toMatch(/too small/i);
  });
});
