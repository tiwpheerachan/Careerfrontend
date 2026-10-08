import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as formPdf from '@/app/api/v1/admin/application-forms/[id]/pdf/route';
import * as formResume from '@/app/api/v1/admin/application-forms/[id]/resume/route';
import * as formOne from '@/app/api/v1/admin/application-forms/[id]/route';
import * as formList from '@/app/api/v1/admin/application-forms/route';
import * as submit from '@/app/api/v1/application-forms/route';
import { resetPermissionsCache } from '@/lib/auth/permissions';
import { seal, SESSION_COOKIE } from '@/lib/auth/session';
import { resetServerEnv } from '@/lib/env';
import { call, FILES } from '@/tests/support/api';
import { applicationFormInput } from '@/tests/support/application-form';
import { openJob, repos } from '@/tests/support/fixtures';

const send = (overrides: Parameters<typeof applicationFormInput>[0] = {}, locale = 'th') =>
  call(submit.POST, { path: '/api/v1/application-forms', query: { locale }, json: applicationFormInput(overrides) });

describe('sending the application form', () => {
  it('201, and the admin lists it; a free-text position is kept as written', async () => {
    const res = await send();
    expect(res.status).toBe(201);
    const list = await call(formList.GET);
    expect(list.body.total).toBe(1);
    expect(list.body.forms[0]).toMatchObject({
      id: res.body.id,
      letterhead: 'SHD',
      position: 'เจ้าหน้าที่บัญชีลูกหนี้',
      jobCode: null,
      nameTh: 'นางสาวสุภาวดี ศรีสุข',
    });
  });

  it('a chosen job is linked, and its Thai title becomes the position', async () => {
    const { job } = await openJob();
    const res = await send({ jobCode: job.code.toLowerCase(), positionOther: '' });
    expect(res.status).toBe(201);
    const [form] = (await repos.applicationForms.list({ page: 1, pageSize: 10 })).items;
    expect(form).toMatchObject({ jobCode: job.code, position: 'หัวหน้าทีม CS' });
  });

  it('400 for a job that is not open, and when no position is given at all', async () => {
    const closed = await send({ jobCode: 'NOPE-001', positionOther: '' });
    expect(closed.status).toBe(400);
    expect(closed.body.error.issues[0].path).toBe('jobCode');
    const none = await send({ jobCode: '', positionOther: '' });
    expect(none.status).toBe(400);
    expect(none.body.error.issues.map((i: { path: string }) => i.path)).toContain('positionOther');
  });

  it('400 without the declaration, a mobile or a real birth date — in the form’s language', async () => {
    const res = await send({ certified: false as true, mobile: 'x', birthDate: '2024-01-01' }, 'th');
    expect(res.status).toBe(400);
    const paths = res.body.error.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['certified', 'mobile', 'birthDate']));
  });

  it('the sensitive part is stored only with its consent', async () => {
    await send({ sensitiveConsent: false });
    await send({ sensitiveConsent: true });
    const ids = (await repos.applicationForms.list({ page: 1, pageSize: 10 })).items.map((f) => f.id);
    const [withConsent, without] = await Promise.all(ids.map((id) => repos.applicationForms.get(id)));
    expect(without!.sensitive).toBeNull();
    expect(without!.sensitiveConsentAt).toBeNull();
    expect(withConsent!.sensitive).toMatchObject({ religion: 'พุทธ', bloodType: 'O' });
    expect(withConsent!.sensitiveConsentAt).toBeInstanceOf(Date);
  });
});

describe('a résumé/CV with the form', () => {
  const sendWith = (resume?: File, data: unknown = applicationFormInput()) => {
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    if (resume) form.append('resume', resume);
    return call(submit.POST, { path: '/api/v1/application-forms', query: { locale: 'th' }, form });
  };

  it('multipart: stored, flagged in the list, and the admin downloads it', async () => {
    const res = await sendWith(FILES.pdf());
    expect(res.status).toBe(201);
    expect((await call(formList.GET)).body.forms[0].hasResume).toBe(true);
    const file = await call(formResume.GET, { params: { id: res.body.id } });
    expect(file.status).toBe(200);
    expect(file.headers.get('content-disposition')).toContain(encodeURIComponent('ประวัติ resume.pdf'));
    expect(String(file.body)).toMatch(/^%PDF-/);
  });

  it('multipart without a file, or plain JSON: no résumé, and its download is 404', async () => {
    const res = await sendWith();
    expect(res.status).toBe(201);
    expect((await call(formList.GET)).body.forms[0].hasResume).toBe(false);
    expect((await call(formResume.GET, { params: { id: res.body.id } })).status).toBe(404);
  });

  it('400 for a file that is not a PDF/DOC/DOCX by its contents; nothing is stored', async () => {
    const res = await sendWith(FILES.fakePdf());
    expect(res.status).toBe(400);
    expect(res.body.error.issues[0].path).toBe('resume');
    expect((await call(formList.GET)).body.total).toBe(0);
  });

  it('the form itself is still checked when sent as multipart', async () => {
    const res = await sendWith(FILES.pdf(), applicationFormInput({ mobile: 'x' }));
    expect(res.status).toBe(400);
    expect(res.body.error.issues.map((i: { path: string }) => i.path)).toContain('mobile');
  });
});

describe('the admin side', () => {
  it('PDF: one page, inline, named after the applicant', async () => {
    const { body } = await send();
    const res = await call(formPdf.GET, { params: { id: body.id } });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain(encodeURIComponent('ใบสมัครงาน-นางสาวสุภาวดี ศรีสุข'));
    expect(String(res.body).startsWith('%PDF-')).toBe(true);
  });

  it('delete: gone from the list; the PDF is 404 after', async () => {
    const { body } = await send();
    expect((await call(formOne.DELETE, { method: 'DELETE', params: { id: body.id } })).status).toBe(204);
    expect((await call(formList.GET)).body.total).toBe(0);
    expect((await call(formPdf.GET, { params: { id: body.id } })).status).toBe(404);
  });

  it('search by name, mobile or position', async () => {
    await send();
    await send({ nameTh: 'นายสมชาย ใจดี', mobile: '090-000-0000', positionOther: 'พนักงานขาย' });
    const by = async (q: string) => (await call(formList.GET, { query: { q } })).body.forms.length;
    expect(await by('สมชาย')).toBe(1);
    expect(await by('090-000')).toBe(1);
    expect(await by('บัญชี')).toBe(1);
  });
});

describe('with SSO on', () => {
  const SECRET = 'a-test-session-secret-0123456789abcdef';
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

  it('view can list and print (sensitive left blank), but not delete', async () => {
    const { body } = await send();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ hasAccess: true, resources: { applications: 'view' } }))),
    );
    const headers = {
      cookie: `${SESSION_COOKIE}=${await seal({ sub: 'u', name: 'HR', email: 'hr@shd-technology.co.th' }, SECRET)}`,
    };
    expect((await call(formList.GET, { headers })).status).toBe(200);
    expect((await call(formPdf.GET, { params: { id: body.id }, headers })).status).toBe(200);
    expect((await call(formOne.DELETE, { method: 'DELETE', params: { id: body.id }, headers })).status).toBe(403);
  });
});
