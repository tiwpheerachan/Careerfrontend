import { asc } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import * as one from '@/app/api/v1/admin/interview-evaluations/[id]/route';
import * as pdf from '@/app/api/v1/admin/interview-evaluations/pdf/route';
import * as evaluations from '@/app/api/v1/admin/interview-evaluations/route';
import { adminAuditLogs } from '@/lib/db/schema';
import { call } from '@/tests/support/api';
import { testDb } from '@/tests/support/db';

const BASE = '/api/v1/admin/interview-evaluations';
const evaluation = {
  candidateName: 'Somchai Audit',
  interviewDate: '2026-10-08',
  round: 1,
  evaluatorRole: 'HR',
  senior: false,
  generalScores: Array(10).fill(4),
  result: 'PASS',
  comment: 'ok',
};

describe('the admin audit trail', () => {
  it('keeps who created, deleted and downloaded what — not plain reads', async () => {
    const created = await call(evaluations.POST, { path: BASE, json: evaluation });
    expect(created.status).toBe(201);
    const id = created.body.evaluation.id as string;

    await call(evaluations.GET, { path: BASE });
    await call(pdf.GET, { path: `${BASE}/pdf`, query: { candidate: 'name:Somchai Audit', role: 'HR', lang: 'th' } });
    await call(one.DELETE, { method: 'DELETE', path: `${BASE}/${id}`, params: { id } });
    await call(one.DELETE, { method: 'DELETE', path: `${BASE}/${id}`, params: { id } }); // already gone: 404, kept too

    const rows = await testDb.select().from(adminAuditLogs).orderBy(asc(adminAuditLogs.pk));
    expect(rows.map((r) => [r.action, r.method, r.status])).toEqual([
      ['create', 'POST', 201],
      ['download', 'GET', 200],
      ['delete', 'DELETE', 204],
      ['delete', 'DELETE', 404],
    ]);
    const [create, download, remove] = rows;
    expect(create).toMatchObject({ resource: 'interview-evaluations', targetId: null, path: BASE });
    expect(create!.actorEmail).toBeTruthy();
    expect(create!.body).toMatchObject({ candidateName: 'Somchai Audit', comment: 'ok' });
    expect(download!.path).toContain('/pdf?candidate=');
    expect(download!.body).toBeNull();
    expect(remove).toMatchObject({ targetId: id, path: `${BASE}/${id}` });
  });
});
