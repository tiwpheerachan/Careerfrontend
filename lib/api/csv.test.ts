import { describe, expect, it } from 'vitest';
import { asText, csvDateTime, toCsv } from './csv';

const line = (cells: unknown[]) => toCsv(['h'], [cells]).split('\r\n')[1];

describe('CSV', () => {
  it('writes times in Bangkok, to the minute', () => {
    expect(csvDateTime(new Date('2026-10-06T06:16:59Z'))).toBe('2026-10-06 13:16');
    expect(csvDateTime(new Date('2026-10-06T17:05:00Z'))).toBe('2026-10-07 00:05');
    expect(line([new Date('2026-10-06T06:16:00Z')])).toBe('"2026-10-06 13:16"');
  });

  it('neutralises formulas an applicant typed', () => {
    expect(line(['=HYPERLINK("http://evil")'])).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(line(['+SUM(A1)'])).toBe(`"'+SUM(A1)"`);
    expect(line(['@cmd'])).toBe(`"'@cmd"`);
  });

  it('shows phone numbers exactly as typed — no apostrophe, no lost 0', () => {
    expect(line([asText('+66 81 234 5678')])).toBe('"=""+66 81 234 5678"""');
    expect(line([asText('0812345678')])).toBe('"=""0812345678"""');
    // Not a phone number: the ordinary guard.
    expect(line([asText('+cmd|calc')])).toBe(`"'+cmd|calc"`);
    expect(line([asText('=1+1')])).toBe(`"'=1+1"`);
    expect(line([asText(null)])).toBe('""');
  });
});
