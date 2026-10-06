import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { testDb } from '@/tests/support/db';
import { applicationInput, jobInput, openJob, repos } from '@/tests/support/fixtures';

describe('jobs: admin', () => {
  it('creates a job with its translations and reads it back', async () => {
    const job = await repos.jobs.create(jobInput({ publishState: 'DRAFT' }), 'hr@shd');
    expect(job).toMatchObject({
      code: 'SHD-TH-OPS-001',
      publishState: 'DRAFT',
      countryCode: 'TH',
      quantity: 2,
      applicantCount: 0,
      publishedAt: null,
      createdBy: 'hr@shd',
    });
    expect(Object.keys(job.translations).sort()).toEqual(['en', 'th']);
    expect(await repos.jobs.get(job.id)).toEqual(job);
  });

  it('stamps published_at the first time it is published, and keeps it', async () => {
    const job = await repos.jobs.create(jobInput({ publishState: 'DRAFT' }), null);
    const published = await repos.jobs.setPublishState(job.id, 'PUBLISHED', null);
    expect(published.publishedAt).toBeInstanceOf(Date);
    await repos.jobs.setPublishState(job.id, 'CLOSED', null);
    const again = await repos.jobs.setPublishState(job.id, 'PUBLISHED', null);
    expect(again.publishedAt).toEqual(published.publishedAt);
  });

  it('refuses a second live job with the same code, but frees the code once deleted', async () => {
    const first = await repos.jobs.create(jobInput(), null);
    await expect(repos.jobs.create(jobInput(), null)).rejects.toBeInstanceOf(ConflictError);
    await repos.jobs.softDelete(first.id, 'hr@shd');
    await expect(repos.jobs.create(jobInput(), null)).resolves.toMatchObject({ code: 'SHD-TH-OPS-001' });
    await expect(repos.jobs.get(first.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('update replaces every field, translations included', async () => {
    const job = await repos.jobs.create(jobInput(), null);
    const updated = await repos.jobs.update(
      job.id,
      jobInput({
        quantity: null,
        department: null,
        translations: { zh: { title: '客服组长', location: null, description: null, qualifications: null } },
      }),
      'hr@shd',
    );
    expect(updated).toMatchObject({ quantity: null, department: null, updatedBy: 'hr@shd' });
    expect(Object.keys(updated.translations)).toEqual(['zh']);
  });

  it('counts applicants in SQL, ignoring deleted ones', async () => {
    const { job, pk } = await openJob();
    const a = await repos.applications.create(pk, applicationInput());
    await repos.applications.create(pk, applicationInput({ email: 'b@example.com' }));
    await repos.applications.softDelete(a.id, null);
    expect((await repos.jobs.get(job.id)).applicantCount).toBe(1);
  });

  it('a malformed id is a 404, not a database error', async () => {
    await expect(repos.jobs.get('not-a-uuid')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('jobs: public', () => {
  it('lists only published, live jobs', async () => {
    await repos.jobs.create(jobInput({ code: 'PUB-1' }), null);
    await repos.jobs.create(jobInput({ code: 'DRAFT-1', publishState: 'DRAFT' }), null);
    await repos.jobs.create(jobInput({ code: 'CLOSED-1', publishState: 'CLOSED' }), null);
    const gone = await repos.jobs.create(jobInput({ code: 'GONE-1' }), null);
    await repos.jobs.softDelete(gone.id, null);

    const list = await repos.jobs.listPublic({ locale: 'th' });
    expect(list.map((j) => j.code)).toEqual(['PUB-1']);
  });

  it('a draft or closed job is not found by its url (the old API served them)', async () => {
    await repos.jobs.create(jobInput({ code: 'DRAFT-1', publishState: 'DRAFT' }), null);
    expect(await repos.jobs.getPublic('DRAFT-1', 'th')).toBeUndefined();
    expect(await repos.jobs.openJobPk('DRAFT-1')).toBeUndefined();
  });

  it('falls back to another language per job, and says which one it used', async () => {
    await repos.jobs.create(
      jobInput({
        code: 'EN-ONLY',
        translations: { en: { title: 'Engineer', location: null, description: null, qualifications: null } },
      }),
      null,
    );
    const job = await repos.jobs.getPublic('en-only', 'zh');
    expect(job).toMatchObject({ code: 'EN-ONLY', title: 'Engineer', locale: 'en' });
  });

  it('filters and searches; % in a search is literal', async () => {
    await repos.jobs.create(jobInput({ code: 'TH-1' }), null);
    await repos.jobs.create(
      jobInput({
        code: 'PH-1',
        countryCode: 'PH',
        department: 'Engineering',
        translations: {
          en: { title: 'Frontend Engineer', location: 'Manila', description: null, qualifications: null },
        },
      }),
      null,
    );

    expect((await repos.jobs.listPublic({ locale: 'en', countryCode: 'PH' })).map((j) => j.code)).toEqual(['PH-1']);
    expect((await repos.jobs.listPublic({ locale: 'en', q: 'frontend' })).map((j) => j.code)).toEqual(['PH-1']);
    expect((await repos.jobs.listPublic({ locale: 'en', q: 'manila' })).map((j) => j.code)).toEqual(['PH-1']);
    expect(await repos.jobs.listPublic({ locale: 'en', q: '%' })).toEqual([]);
  });

  it('facets come from every published job, not from the filtered results', async () => {
    await repos.jobs.create(jobInput({ code: 'TH-1' }), null);
    await repos.jobs.create(jobInput({ code: 'PH-1', countryCode: 'PH', department: 'Engineering' }), null);
    await repos.jobs.create(jobInput({ code: 'VN-1', countryCode: 'VN', publishState: 'DRAFT' }), null);
    expect(await repos.jobs.publicFacets()).toEqual({
      countryCodes: ['PH', 'TH'],
      departments: ['Engineering', 'Operations'],
      levels: ['Experienced'],
    });
  });
});

describe('jobs: subqueries find the right job', () => {
  // Job pks and translation pks drift apart as soon as a job has more than one
  // translation. A subquery that compared t.jobs_pk with an UNQUALIFIED "pk"
  // matched the translation's own pk and returned another job's title.
  it('title search and titles in analytics follow the job, not a translation that shares its pk', async () => {
    await repos.jobs.create(jobInput({ code: 'MANY-LANGS' }), null); // job pk 1, translations pk 1 and 2
    const lone = await repos.jobs.create(
      jobInput({
        code: 'LONE-JOB',
        translations: { en: { title: 'Lighthouse Keeper', location: null, description: null, qualifications: null } },
      }),
      null,
    ); // job pk 2, translation pk 3

    expect((await repos.jobs.listPublic({ locale: 'en', q: 'lighthouse' })).map((j) => j.code)).toEqual(['LONE-JOB']);
    expect((await repos.jobs.list({ q: 'lighthouse' })).map((j) => j.code)).toEqual(['LONE-JOB']);

    const { publishedWithoutApplicants } = await repos.applications.analytics({ days: 7, timeZone: 'Asia/Bangkok' });
    expect(publishedWithoutApplicants.find((j) => j.id === lone.id)?.title).toBe('Lighthouse Keeper');
  });
});

describe('jobs: old links', () => {
  it('finds the new code for an old job id, ignoring case and the spaces it was typed with', async () => {
    const job = await repos.jobs.create(jobInput({ code: 'SHD-TH-ACCOUNTING-AP' }), null);
    await testDb.execute(sql`update jobs set legacy_code = 'SHD-TH- Accounting - AP' where id = ${job.id}`);

    expect(await repos.jobs.codeForLegacy('SHD-TH- Accounting - AP')).toBe('SHD-TH-ACCOUNTING-AP');
    expect(await repos.jobs.codeForLegacy('  shd-th- accounting - ap ')).toBe('SHD-TH-ACCOUNTING-AP');
    expect(await repos.jobs.codeForLegacy('SHD-TH- Something else')).toBeUndefined();

    await repos.jobs.softDelete(job.id, null);
    expect(await repos.jobs.codeForLegacy('SHD-TH- Accounting - AP')).toBeUndefined();
  });
});
