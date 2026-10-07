import { describe, expect, it } from 'vitest';
import { candidateKey, parseCandidateKey } from './candidate-key';

const id = '0199b3c4-7d2e-7a10-9c4b-2f6e8d1a5b37';

describe('candidate keys', () => {
  it('round-trips a linked applicant, a form, and a typed-in name', () => {
    expect(parseCandidateKey(candidateKey({ kind: 'application', id, name: 'A' }))).toEqual({
      kind: 'application',
      id,
    });
    expect(parseCandidateKey(candidateKey({ kind: 'form', id, name: 'A' }))).toEqual({ kind: 'form', id });
    expect(candidateKey({ kind: 'manual', id: null, name: '  สมชาย ใจดี ' })).toBe('name:สมชาย ใจดี');
    expect(parseCandidateKey('name:สมชาย ใจดี')).toEqual({ kind: 'manual', name: 'สมชาย ใจดี' });
  });

  it('refuses anything malformed', () => {
    for (const key of [
      '',
      'application',
      'application:not-a-uuid',
      'job:' + id,
      'name:   ',
      `name:${'x'.repeat(151)}`,
    ]) {
      expect(parseCandidateKey(key), key).toBeUndefined();
    }
  });
});
