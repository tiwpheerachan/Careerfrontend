import { describe, expect, it } from 'vitest';
import { adminLocaleOf, intlLocale } from './admin';

describe('the admin language', () => {
  it('th, en and zh from the cookie; anything else is Thai', () => {
    expect(adminLocaleOf('zh')).toBe('zh');
    expect(adminLocaleOf('en')).toBe('en');
    expect(adminLocaleOf('fr')).toBe('th');
    expect(adminLocaleOf(undefined)).toBe('th');
  });

  it('formats dates in each language’s own way', () => {
    const day = new Date('2026-10-06T07:00:00Z');
    const format = (l: 'th' | 'en' | 'zh') =>
      new Intl.DateTimeFormat(intlLocale(l), { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(day);
    expect(format('th')).toContain('2569'); // Thai calendar
    expect(format('en')).toBe('6 Oct 2026');
    expect(format('zh')).toBe('2026年10月6日');
  });
});
