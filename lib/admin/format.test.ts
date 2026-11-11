import { describe, expect, it } from 'vitest';
import { formatDateTime } from './format';

// The same text on every ICU/CLDR (Node 26's CLDR 49 added "น." to Thai times;
// browsers did not), so server and browser render alike.
describe('formatDateTime', () => {
  const at = '2026-10-07T07:28:00Z'; // 14:28 in Bangkok

  it('writes each admin language the way it always has', () => {
    expect(formatDateTime(at, 'th')).toBe('7 ต.ค. 2569 14:28');
    expect(formatDateTime(at, 'en')).toBe('7 Oct 2026, 14:28');
    expect(formatDateTime(at, 'zh')).toBe('2026年10月7日 14:28');
  });

  it('uses a 24-hour clock in Bangkok time, midnight as 00', () => {
    expect(formatDateTime('2026-10-06T17:05:00Z', 'th')).toBe('7 ต.ค. 2569 00:05');
  });

  it('shows a dash for no date', () => {
    expect(formatDateTime(null, 'en')).toBe('—');
  });
});
