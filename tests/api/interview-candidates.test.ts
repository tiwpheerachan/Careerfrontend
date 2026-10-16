import { describe, expect, it } from 'vitest';
import * as resumeRoute from '@/app/api/v1/admin/interview-candidates/[id]/resume/route';
import * as linkRoute from '@/app/api/v1/admin/interview-candidates/[id]/link/route';
import * as candidates from '@/app/api/v1/admin/interview-candidates/route';
import * as evaluations from '@/app/api/v1/admin/interview-evaluations/route';
import * as submitForm from '@/app/api/v1/application-forms/route';
import { call, FILES } from '@/tests/support/api';
import { applicationFormInput } from '@/tests/support/application-form';
import { repos } from '@/tests/support/fixtures';

/**
 * A candidate HR adds before they have an application (migration 0013): found,
 * evaluated and invited like anyone else, then linked to their form.
 */
const scores = (n: number) => Array(10).fill(n) as number[];

const added = { name: 'สมชาย มาก่อน', position: 'Engineer', department: 'R&D', phone: '081-555-0101' };

async function addCandidate(resume?: File) {
  const form = new FormData();
  form.append('data', JSON.stringify(added));
  if (resume) form.append('resume', resume);
  const res = await call(candidates.POST, { form });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

const evaluation = (interviewCandidateId: string, overrides: Record<string, unknown> = {}) => ({
  interviewCandidateId,
  candidateName: added.name,
  interviewDate: '2026-10-16',
  round: 1,
  evaluatorRole: 'DEPARTMENT',
  senior: false,
  generalScores: scores(4),
  result: 'PASS',
  ...overrides,
});

/** An application form sent from the public site; its public id. */
async function aForm() {
  const res = await call(submitForm.POST, { path: '/api/v1/application-forms', json: applicationFormInput() });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe('a candidate added without an application', () => {
  it('is added with a résumé, found by name and by phone digits, and its résumé opens', async () => {
    const id = await addCandidate(FILES.pdf());
    for (const q of ['สมชาย', '0815550101']) {
      const found = await call(candidates.GET, { query: { q } });
      expect(found.body.candidates).toEqual(
        expect.arrayContaining([expect.objectContaining({ kind: 'pending', id, name: added.name, email: null })]),
      );
    }
    const file = await call(resumeRoute.GET, { params: { id } });
    expect(file.status).toBe(200);
    expect(String(file.body)).toMatch(/^%PDF-/);
    expect((await repos.interviewCandidates.get(id)).phone).toBe(added.phone);
  });

  it('400 without a name or a real phone; a file that is not a résumé is refused and nothing is added', async () => {
    const bad = await call(candidates.POST, { json: { ...added, name: ' ', phone: '12' } });
    expect(bad.status).toBe(400);
    expect(bad.body.error.issues.map((i: { path: string }) => i.path)).toEqual(
      expect.arrayContaining(['name', 'phone']),
    );
    const form = new FormData();
    form.append('data', JSON.stringify(added));
    form.append('resume', FILES.fakePdf());
    expect((await call(candidates.POST, { form })).status).toBe(400);
    expect((await call(candidates.GET, { query: { q: 'สมชาย' } })).body.candidates).toHaveLength(0);
  });

  it('is evaluated in the admin and through an invitation, both under pending:<id>', async () => {
    const id = await addCandidate();
    expect((await call(evaluations.POST, { json: evaluation(id) })).status).toBe(201);
    const invitation = await repos.interviewInvitations.create(
      {
        applicationId: null,
        applicationFormId: null,
        interviewCandidateId: id,
        candidateName: added.name,
        position: added.position,
        department: added.department,
        round: 2,
        evaluatorRole: 'DEPARTMENT',
        senior: false,
        invitees: [
          { email: 'head@shd-technology.co.th', name: 'Head', unionId: null, jobTitle: null, department: null },
        ],
      },
      'hr@shd-technology.co.th',
    );
    expect(invitation.candidate).toMatchObject({ kind: 'pending', id });
    await repos.interviewInvitations.submit(
      invitation.token,
      { email: 'head@shd-technology.co.th', name: 'Head' },
      {
        senior: false,
        generalScores: scores(3),
        seniorScores: null,
        result: 'PENDING',
        failReason: null,
        comment: null,
      },
    );
    const mine = await repos.interviewEvaluations.forCandidate({ kind: 'pending', id });
    expect(mine.map((e) => e.round).sort()).toEqual([1, 2]);
    expect(mine.every((e) => e.candidate.kind === 'pending' && e.candidate.id === id)).toBe(true);
  });

  it('linked to its form: every evaluation and invitation becomes the form’s, once', async () => {
    const id = await addCandidate();
    await call(evaluations.POST, { json: evaluation(id) });
    await repos.interviewInvitations.create(
      {
        applicationId: null,
        applicationFormId: null,
        interviewCandidateId: id,
        candidateName: added.name,
        position: null,
        department: null,
        round: 1,
        evaluatorRole: 'HR',
        senior: false,
        invitees: [{ email: 'hr2@shd-technology.co.th', name: null, unionId: null, jobTitle: null, department: null }],
      },
      'hr@shd-technology.co.th',
    );
    const formId = await aForm();

    const res = await call(linkRoute.POST, { params: { id }, json: { applicationFormId: formId } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ kind: 'form', id: formId, key: `form:${formId}` });

    const form = { kind: 'form' as const, id: formId };
    expect(await repos.interviewEvaluations.forCandidate(form)).toHaveLength(1);
    expect(await repos.interviewInvitations.forCandidate(form)).toHaveLength(1);
    expect(await repos.interviewEvaluations.forCandidate({ kind: 'pending', id })).toHaveLength(0);
    expect((await repos.interviewCandidates.get(id)).linkedTo).toEqual(form);
    // No longer offered when picking a candidate: it is found as its form now.
    expect(
      (await call(candidates.GET, { query: { q: 'สมชาย มาก่อน' } })).body.candidates.some(
        (c: { kind: string }) => c.kind === 'pending',
      ),
    ).toBe(false);
    // A later evaluation through the added candidate goes with the form too.
    await call(evaluations.POST, { json: evaluation(id, { round: 2 }) });
    expect(await repos.interviewEvaluations.forCandidate(form)).toHaveLength(2);

    expect((await call(linkRoute.POST, { params: { id }, json: { applicationFormId: formId } })).status).toBe(409);
  });

  it('409 when the same evaluator scored the same round and side of both; nothing moves', async () => {
    const id = await addCandidate();
    const formId = await aForm();
    await call(evaluations.POST, { json: evaluation(id) });
    await call(evaluations.POST, {
      json: { ...evaluation(id), interviewCandidateId: null, applicationFormId: formId },
    });
    const res = await call(linkRoute.POST, { params: { id }, json: { applicationFormId: formId } });
    expect(res.status).toBe(409);
    expect(await repos.interviewEvaluations.forCandidate({ kind: 'pending', id })).toHaveLength(1);
    expect((await repos.interviewCandidates.get(id)).linkedTo).toBeNull();
  });

  it('400 for linking to nothing, to both, or to a form that is not there', async () => {
    const id = await addCandidate();
    for (const json of [{}, { applicationId: id, applicationFormId: id }, { applicationFormId: id }]) {
      expect((await call(linkRoute.POST, { params: { id }, json })).status, JSON.stringify(json)).toBe(400);
    }
  });
});
