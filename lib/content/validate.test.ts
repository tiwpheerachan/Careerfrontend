import { describe, expect, it } from 'vitest';
import { checkOverride, describeProblem, messageNames } from './validate';

describe('site text overrides', () => {
  const gallery = 'แกลเลอรีแถวบน {n}';

  it('accepts plain text and text that keeps its arguments', () => {
    expect(checkOverride('ร่วมงานกับเรา', 'มาร่วมทีม SHD', 'th')).toBeNull();
    expect(checkOverride('รูปที่ {n} ของแกลเลอรี', gallery, 'th')).toBeNull();
    expect(checkOverride('{count, plural, one {# opening} other {# openings}}', '{count} openings', 'en')).toBeNull();
  });

  it('refuses empty text — revert is the way back', () => {
    expect(checkOverride('', gallery, 'th')).toEqual({ code: 'empty' });
    expect(checkOverride('   ', gallery, 'th')).toEqual({ code: 'empty' });
  });

  it('refuses broken ICU', () => {
    expect(checkOverride('UXTEST แกลเลอรีแถวบน {n', gallery, 'th')).toEqual({ code: 'syntax' });
    expect(checkOverride('{count, plural, one {#}}', '{count} openings', 'en')).toEqual({ code: 'syntax' });
  });

  it('refuses dropping or inventing an argument, or a new tag', () => {
    expect(checkOverride('แกลเลอรีแถวบน', gallery, 'th')).toEqual({ code: 'missing', names: ['n'] });
    // Quoted braces are text, so {n} is gone.
    expect(checkOverride("แกลเลอรี '{n}'", gallery, 'th')).toEqual({ code: 'missing', names: ['n'] });
    expect(checkOverride('{n} / {total}', gallery, 'th')).toEqual({ code: 'unknown', names: ['total'] });
    expect(checkOverride('<b>{n}</b>', gallery, 'th')).toEqual({ code: 'unknown', names: ['<b>'] });
  });

  it('checks only the syntax of a key the site no longer has', () => {
    expect(checkOverride('{anything}', undefined, 'th')).toBeNull();
    expect(checkOverride('{broken', undefined, 'th')).toEqual({ code: 'syntax' });
  });

  it('collects names inside plural and select branches', () => {
    expect(messageNames('{count, plural, other {# in {office}}}', 'en')).toEqual({
      args: new Set(['count', 'office']),
      tags: new Set(),
    });
  });

  it('says what is wrong with the names in braces', () => {
    const t = (key: string, values?: Record<string, string>) => `${key} ${JSON.stringify(values ?? {})}`;
    expect(describeProblem({ code: 'missing', names: ['n', 'count'] }, t)).toBe(
      'errors.missing {"names":"{n}, {count}"}',
    );
  });
});
