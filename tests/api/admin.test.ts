import { afterEach, describe, expect, it, vi } from 'vitest';
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

  it('is closed in production until sign-in exists: 503, no data', async () => {
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
