import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/lib/errors';
import { testDb } from '@/tests/support/db';
import { applicationInput, openJob, repos } from '@/tests/support/fixtures';

const countApplications = async () =>
  ((await testDb.execute(sql`select count(*)::int as n from applications`)) as unknown as Array<{ n: number }>)[0]!.n;

describe('applications: create', () => {
  it('saves the application with everything attached, and reads it back', async () => {
    const { job, pk } = await openJob();
    const { id } = await repos.applications.create(pk, applicationInput());
    const detail = await repos.applications.get(id);

    expect(detail).toMatchObject({
      id,
      stage: 'NEW',
      firstName: 'Somchai',
      websiteUrl: 'https://example.com/somchai',
      job: { id: job.id, code: job.code, title: 'หัวหน้าทีม CS' },
      skills: ['Excel', 'Customer Service'],
    });
    // The months the old backend silently dropped are kept.
    expect(detail.educations[0]).toMatchObject({ level: 'BACHELOR', startMonth: '2015-06', endMonth: '2019-05' });
    expect(detail.experiences[0]).toMatchObject({ startMonth: '2019-07', endMonth: null });
    expect(detail.files).toHaveLength(1);
    expect(detail.stageHistory).toEqual([{ fromStage: null, toStage: 'NEW', changedBy: null, at: expect.any(Date) }]);
  });

  it('is all or nothing: a bad child row leaves no application behind', async () => {
    const { pk } = await openJob();
    await expect(repos.applications.create(pk, applicationInput({ skills: ['Excel', '  '] }))).rejects.toThrow();
    expect(await countApplications()).toBe(0);
  });

  it('refuses a javascript: website (the old admin rendered it as a link)', async () => {
    const { pk } = await openJob();
    await expect(
      repos.applications.create(pk, applicationInput({ websiteUrl: 'javascript:alert(document.cookie)' })),
    ).rejects.toThrow();
    expect(await countApplications()).toBe(0);
  });

  it('allows one résumé per application', async () => {
    const { pk } = await openJob();
    const resume = applicationInput().files[0]!;
    await expect(
      repos.applications.create(
        pk,
        applicationInput({ files: [resume, { ...resume, storagePath: `${resume.storagePath}-2` }] }),
      ),
    ).rejects.toThrow();
  });
});

describe('applications: review', () => {
  it('records each stage change with who made it; setting the same stage is a no-op', async () => {
    const { pk } = await openJob();
    const { id } = await repos.applications.create(pk, applicationInput());

    await repos.applications.setStage(id, 'REVIEWING', 'hr@shd');
    await repos.applications.setStage(id, 'REVIEWING', 'hr@shd');
    await repos.applications.setStage(id, 'HIRED', 'lead@shd');

    const detail = await repos.applications.get(id);
    expect(detail.stage).toBe('HIRED');
    expect(detail.stageChangedBy).toBe('lead@shd');
    expect(detail.stageChangedAt).toBeInstanceOf(Date);
    expect(detail.stageHistory.map((h) => [h.fromStage, h.toStage, h.changedBy])).toEqual([
      [null, 'NEW', null],
      ['NEW', 'REVIEWING', 'hr@shd'],
      ['REVIEWING', 'HIRED', 'lead@shd'],
    ]);
  });

  it('keeps notes as a history; a deleted note disappears', async () => {
    const { pk } = await openJob();
    const { id } = await repos.applications.create(pk, applicationInput());
    const first = await repos.applications.addNote(id, 'Good communicator', 'hr@shd');
    await repos.applications.addNote(id, 'Call back Monday', 'hr@shd');
    await repos.applications.deleteNote(id, first.id, 'hr@shd');

    const detail = await repos.applications.get(id);
    expect(detail.notes.map((n) => n.body)).toEqual(['Call back Monday']);
    await expect(repos.applications.deleteNote(id, first.id, null)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('a soft-deleted application is gone from the admin', async () => {
    const { pk } = await openJob();
    const { id } = await repos.applications.create(pk, applicationInput());
    await repos.applications.softDelete(id, 'hr@shd');
    await expect(repos.applications.get(id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await repos.applications.list({ page: 1, pageSize: 20 })).total).toBe(0);
  });
});

describe('applications: list', () => {
  it('pages, searches, filters by job and stage, and counts per stage', async () => {
    const { pk } = await openJob({ code: 'JOB-A' });
    const other = await openJob({ code: 'JOB-B' });
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push((await repos.applications.create(pk, applicationInput({ email: `a${i}@example.com` }))).id);
    }
    await repos.applications.create(other.pk, applicationInput({ firstName: 'Mali', email: 'mali@example.com' }));
    await repos.applications.setStage(ids[0]!, 'SHORTLISTED', null);

    const page1 = await repos.applications.list({ page: 1, pageSize: 4 });
    expect(page1.total).toBe(6);
    expect(page1.rows).toHaveLength(4);
    expect((await repos.applications.list({ page: 2, pageSize: 4 })).rows).toHaveLength(2);

    expect((await repos.applications.list({ page: 1, pageSize: 20, q: 'mali' })).total).toBe(1);
    expect((await repos.applications.list({ page: 1, pageSize: 20, q: 'somchai jaidee' })).total).toBe(5);
    expect((await repos.applications.list({ page: 1, pageSize: 20, jobId: other.job.id })).total).toBe(1);
    expect((await repos.applications.list({ page: 1, pageSize: 20, jobId: 'nope' })).total).toBe(0);

    const shortlisted = await repos.applications.list({ page: 1, pageSize: 20, stage: 'SHORTLISTED' });
    expect(shortlisted.total).toBe(1);
    // Chip counts ignore the stage filter itself, so every chip keeps its number.
    expect(shortlisted.stageCounts).toMatchObject({ NEW: 5, SHORTLISTED: 1 });
  });

  it('export follows the same filters with no row cap, the job filter included', async () => {
    const { pk } = await openJob({ code: 'JOB-A' });
    const other = await openJob({ code: 'JOB-B' });
    await repos.applications.create(pk, applicationInput());
    await repos.applications.create(other.pk, applicationInput({ email: 'x@example.com' }));
    expect(await repos.applications.exportRows({ jobId: other.job.id })).toHaveLength(1);
  });
});

describe('applications: analytics', () => {
  it('counts by stage, department, source and job; zero-fills the days', async () => {
    const { pk } = await openJob({ code: 'JOB-A' });
    await openJob({ code: 'JOB-EMPTY' });
    const { id } = await repos.applications.create(pk, applicationInput());
    await repos.applications.create(pk, applicationInput({ email: 'b@example.com', sourceChannel: ' ' }));
    await repos.applications.setStage(id, 'HIRED', null);

    const a = await repos.applications.analytics({ days: 30, timeZone: 'Asia/Bangkok' });
    expect(a.totals).toEqual({ applications: 2, publishedJobs: 2, hired: 1, hireRate: 0.5, avgPerPublishedJob: 1 });
    expect(a.byStage).toMatchObject({ NEW: 1, HIRED: 1 });
    expect(a.bySource).toEqual(
      expect.arrayContaining([
        { name: 'LinkedIn', count: 1 },
        { name: null, count: 1 },
      ]),
    );
    expect(a.byJob).toEqual([{ id: expect.any(String), code: 'JOB-A', title: 'หัวหน้าทีม CS', count: 2 }]);
    expect(a.daily).toHaveLength(30);
    expect(a.daily.at(-1)!.count).toBe(2);
    expect(a.publishedWithoutApplicants.map((j) => j.code)).toEqual(['JOB-EMPTY']);
  });
});

describe('applications: sorting', () => {
  it('sorts by name, stage or job, both ways, with a stable tie-break', async () => {
    const { pk } = await openJob({ code: 'JOB-B' });
    const other = await openJob({ code: 'JOB-A' });
    const zed = await repos.applications.create(pk, applicationInput({ firstName: 'Zed', email: 'z@example.com' }));
    await repos.applications.create(pk, applicationInput({ firstName: 'Anna', email: 'a@example.com' }));
    await repos.applications.create(other.pk, applicationInput({ firstName: 'mia', email: 'm@example.com' }));
    await repos.applications.setStage(zed.id, 'HIRED', null);

    const names = async (sort: 'name' | 'stage' | 'job', dir?: 'asc' | 'desc') =>
      (await repos.applications.list({ page: 1, pageSize: 10, sort, dir })).rows.map((r) => r.firstName);

    // C collation: upper case before lower case.
    expect(await names('name')).toEqual(['Anna', 'Zed', 'mia']);
    expect(await names('name', 'desc')).toEqual(['mia', 'Zed', 'Anna']);
    expect((await names('stage')).at(-1)).toBe('Zed'); // HIRED is the last stage
    expect((await names('job'))[0]).toBe('mia'); // JOB-A first
  });
});
