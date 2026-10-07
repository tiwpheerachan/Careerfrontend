import { describe, expect, it } from 'vitest';
import { appTimeZone, timeZones } from './timezone';

describe('time zones (company standard: Asia/Bangkok)', () => {
  it('the app runs in Asia/Bangkok', () => {
    expect(appTimeZone()).toBe('Asia/Bangkok');
    // Local time really is +07: 00:30 UTC is 07:30 here.
    expect(new Date(Date.UTC(2026, 0, 1, 0, 30)).getHours()).toBe(7);
  });

  it('is ok only when all three match', () => {
    expect(timeZones('Asia/Bangkok').app).toBe('Asia/Bangkok');
    expect(timeZones('UTC').ok).toBe(false);
    expect(timeZones(null).ok).toBe(false);
  });
});
