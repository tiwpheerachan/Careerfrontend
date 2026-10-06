import { describe, expect, it } from 'vitest';
import * as applications from '@/app/api/v1/jobs/[code]/applications/route';
import * as job from '@/app/api/v1/jobs/[code]/route';
import * as jobs from '@/app/api/v1/jobs/route';
import * as adminApplication from '@/app/api/v1/admin/applications/[id]/route';
import * as download from '@/app/api/v1/admin/applications/[id]/files/[fileId]/route';
import { FILES, applicationForm, call } from '@/tests/support/api';
import { jobInput, repos } from '@/tests/support/fixtures';

const apply = (code: string, form: FormData) =>
  call(applications.POST, { params: { code }, form, path: `/api/v1/jobs/${code}/applications` });

describe('GET /jobs', () => {
  it('lists published jobs with facets from every published job', async () => {
    await repos.jobs.create(jobInput({ code: 'PUB-TH' }), null);
    await repos.jobs.create(jobInput({ code: 'PUB-PH', countryCode: 'PH' }), null);
    await repos.jobs.create(jobInput({ code: 'DRAFT-1', publishState: 'DRAFT' }), null);

    const res = await call(jobs.GET, { query: { locale: 'en', country: 'ph' } });
    expect(res.status).toBe(200);
    expect(res.body.jobs.map((j: { code: string }) => j.code)).toEqual(['PUB-PH']);
    expect(res.body.facets.countryCodes).toEqual(['PH', 'TH']);
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('refuses an unknown locale with the field named', async () => {
    const res = await call(jobs.GET, { query: { locale: 'fr' } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
    expect(res.body.error.issues[0].path).toBe('locale');
  });
});

describe('GET /jobs/{code}', () => {
  it('finds a published job case-insensitively; a draft is a 404', async () => {
    await repos.jobs.create(jobInput({ code: 'PUB-1' }), null);
    await repos.jobs.create(jobInput({ code: 'DRAFT-1', publishState: 'DRAFT' }), null);

    expect((await call(job.GET, { params: { code: 'pub-1' } })).body.job.code).toBe('PUB-1');
    const draft = await call(job.GET, { params: { code: 'DRAFT-1' } });
    expect(draft.status).toBe(404);
    expect(draft.body.error.code).toBe('not_found');
    expect((await call(job.GET, { params: { code: 'bad code!' } })).status).toBe(404);
  });
});

describe('POST /jobs/{code}/applications', () => {
  it('saves the application and its files; the admin can open the file', async () => {
    await repos.jobs.create(jobInput({ code: 'OPEN-1' }), null);
    const form = applicationForm({ transcript: FILES.pdf() });
    form.append('attachments', FILES.png());

    const res = await apply('OPEN-1', form);
    expect(res.status).toBe(201);

    const detail = await call(adminApplication.GET, { params: { id: res.body.id } });
    const app = detail.body.application;
    expect(app).toMatchObject({ firstName: 'Somchai', websiteUrl: 'https://example.com/me', stage: 'NEW' });
    expect(app.skills).toEqual(['Excel', 'Customer Service']); // de-duplicated
    expect(app.files.map((f: { kind: string }) => f.kind).sort()).toEqual(['ATTACHMENT', 'RESUME', 'TRANSCRIPT']);
    expect(JSON.stringify(app)).not.toContain('storagePath');

    const resume = app.files.find((f: { kind: string }) => f.kind === 'RESUME');
    expect(resume).toMatchObject({ fileName: 'ประวัติ resume.pdf', contentType: 'application/pdf' });
    const file = await call(download.GET, { params: { id: app.id, fileId: resume.id } });
    expect(file.status).toBe(200);
    expect(String(file.body)).toMatch(/^%PDF-/);
    expect(file.headers.get('content-disposition')).toContain("filename*=UTF-8''");
  });

  it('lists every problem at once, the files included', async () => {
    await repos.jobs.create(jobInput({ code: 'OPEN-1' }), null);
    const res = await apply(
      'OPEN-1',
      applicationForm({ email: 'not-an-email', websiteUrl: 'javascript:alert(1)', termsAccepted: null, resume: null }),
    );
    expect(res.status).toBe(400);
    expect(res.body.error.issues.map((i: { path: string }) => i.path).sort()).toEqual(
      ['email', 'resume', 'termsAccepted', 'websiteUrl'].sort(),
    );
  });

  it('judges a file by its bytes: an HTML page named cv.pdf is refused', async () => {
    await repos.jobs.create(jobInput({ code: 'OPEN-1' }), null);
    const res = await apply('OPEN-1', applicationForm({ resume: FILES.fakePdf() }));
    expect(res.status).toBe(400);
    expect(res.body.error.issues).toEqual([
      { path: 'resume', message: expect.stringContaining('not an allowed file') },
    ]);
  });

  it('a draft or closed job takes no applications', async () => {
    await repos.jobs.create(jobInput({ code: 'CLOSED-1', publishState: 'CLOSED' }), null);
    expect((await apply('CLOSED-1', applicationForm())).status).toBe(404);
  });

  it('limits one address to 5 applications per 10 minutes, with Retry-After', async () => {
    await repos.jobs.create(jobInput({ code: 'OPEN-1' }), null);
    for (let i = 0; i < 5; i++) {
      expect((await apply('OPEN-1', applicationForm({ email: `p${i}@example.com` }))).status).toBe(201);
    }
    const sixth = await apply('OPEN-1', applicationForm());
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('too_many_requests');
    expect(Number(sixth.headers.get('retry-after'))).toBeGreaterThan(0);
  });
});
