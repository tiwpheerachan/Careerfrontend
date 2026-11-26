import { describe, expect, it } from 'vitest';
import { safeError } from './log';

describe('an error in the log', () => {
  it('keeps no value a query was sent', () => {
    const cause = Object.assign(new Error('invalid input syntax: "secret@example.com"'), { code: '22P02' });
    const err = new Error('Failed query: insert into "applications" values ($1)\nparams: secret@example.com', {
      cause,
    });
    const text = JSON.stringify(safeError(err));
    expect(text).not.toContain('secret');
    expect(text).toContain('Failed query: insert');
    expect(text).toContain('22P02');
    expect(text).toContain('at ');
  });

  it('keeps an ordinary message', () => {
    expect(safeError(new Error('Storage upload failed (500)'))).toMatchObject({
      message: 'Storage upload failed (500)',
    });
  });
});
