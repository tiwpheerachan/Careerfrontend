import { describe, expect, it } from 'vitest';
import { isoWithOffset } from './time';

describe('log timestamps', () => {
  it('always carry the offset, in Asia/Bangkok', () => {
    expect(isoWithOffset(new Date(Date.UTC(2026, 0, 1, 0, 30, 5, 7)))).toBe('2026-01-01T07:30:05.007+07:00');
  });

  it('Asia/Bangkok has no daylight saving: the offset is +07:00 all year', () => {
    for (let month = 0; month < 12; month++) {
      expect(isoWithOffset(new Date(Date.UTC(2026, month, 15, 12)))).toMatch(/\+07:00$/);
    }
  });

  it('parses back to the same instant', () => {
    const now = new Date();
    expect(Date.parse(isoWithOffset(now))).toBe(now.getTime());
  });
});
