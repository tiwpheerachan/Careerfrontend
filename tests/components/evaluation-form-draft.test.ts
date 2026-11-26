import { describe, expect, it } from 'vitest';
import { restoreDraft, type FormState } from '@/components/admin/interviews/evaluation-form-draft';
import { AdminApiError, apiMessage, twinOf } from '@/lib/admin/client';

const initial: FormState = {
  link: null,
  candidateName: 'Somchai',
  position: '',
  department: '',
  interviewDate: '2026-10-07',
  round: 1,
  evaluatorRole: 'HR',
  senior: false,
  general: Array(10).fill(null),
  seniorScores: Array(5).fill(null),
  result: '',
  failReason: '',
  comment: '',
};
const form: FormState = { ...initial, candidateName: 'X', round: 2, general: Array(10).fill(3), comment: 'ดี' };
const raw = (over: object = {}) => JSON.stringify({ evaluator: 'head', form, history: [], ...over });

describe('the evaluation draft', () => {
  it('comes back whole; through a link only what the invitee fills in', () => {
    expect(restoreDraft(raw(), initial, 'head', false)!.form).toEqual(form);
    expect(restoreDraft(raw(), initial, 'head', true)!.form).toEqual({
      ...initial,
      general: form.general,
      comment: 'ดี',
    });
  });

  it('is not shown to another evaluator, nor restored from a wrong shape', () => {
    expect(restoreDraft(raw(), initial, 'someone else', false)).toBeUndefined();
    expect(restoreDraft(raw({ form: { ...form, general: [9] } }), initial, 'head', false)).toBeUndefined();
    for (const bad of ['', 'null', '{}', '[1]']) expect(restoreDraft(bad, initial, 'head', false)).toBeUndefined();
  });
});

describe('API errors in the admin’s language', () => {
  it('known codes are translated; a 409 naming an evaluation keeps its message', () => {
    document.documentElement.lang = 'zh';
    expect(new AdminApiError(503, 'unavailable', 'Could not reach…').message).toContain('暂时不可用');
    document.documentElement.lang = 'th';
    for (const code of ['network', 'too_many_requests', 'unavailable'])
      expect(apiMessage(code, 'English')).not.toBe('English');
    expect(apiMessage(undefined, '', 503)).toBe(apiMessage('unavailable', ''));
    expect(apiMessage('conflict', 'a@b has evaluated the same round of both — delete one')).toContain('ลบผลประเมิน');
    const id = crypto.randomUUID();
    const twin = `You have already evaluated this round of this candidate (evaluation ${id}) — ask`;
    expect(apiMessage('conflict', twin)).toBe(twin);
    expect(twinOf(twin)).toBe(id);
    expect(apiMessage('bad_request', 'As sent.')).toBe('As sent.');
  });
});
