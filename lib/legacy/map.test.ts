import { describe, expect, it } from 'vitest';
import {
  cleanJobCode,
  countryCodeOf,
  dateOf,
  educationLevelOf,
  oldFileOf,
  publishStateOf,
  skillsOf,
  stageOf,
  text,
  translationsOf,
  websiteOf,
  yearMonthOf,
} from './map';

/** Every rule of the old → new import, against values seen in the old data. */
describe('legacy import mapping', () => {
  it('cleans the old free-text job ids', () => {
    expect(cleanJobCode('SHD-TH- Accounting - AP')).toBe('SHD-TH-ACCOUNTING-AP');
    expect(cleanJobCode('SHD-TH- Videographer & Video Editor')).toBe('SHD-TH-VIDEOGRAPHER-VIDEO-EDITOR');
    expect(cleanJobCode('SHD-TH-70MAI')).toBe('SHD-TH-70MAI');
    expect(cleanJobCode('pkpsf')).toBe('PKPSF');
    expect(() => cleanJobCode(' - ')).toThrow();
  });

  it('maps countries, publish states and stages', () => {
    expect(countryCodeOf('Thailand')).toBe('TH');
    expect(countryCodeOf(' philippines ')).toBe('PH');
    expect(countryCodeOf('TH')).toBe('TH');
    expect(() => countryCodeOf('Atlantis')).toThrow(/Unknown country/);
    expect(publishStateOf('published')).toBe('PUBLISHED');
    expect(publishStateOf(null)).toBe('DRAFT');
    expect(stageOf('reviewing')).toBe('REVIEWING');
    expect(stageOf(null)).toBe('NEW');
  });

  it('borrows a title for a language that has text but no title', () => {
    const t = translationsOf({
      job_id: 'X',
      title_th: 'พนักงานบัญชี',
      title_en: '',
      title_zh: null,
      location_th: 'กรุงเทพฯ',
      location_en: null,
      location_zh: null,
      desc_th: null,
      desc_en: 'English description',
      desc_zh: '',
      qual_th: null,
      qual_en: null,
      qual_zh: null,
    });
    expect(t.th?.title).toBe('พนักงานบัญชี');
    expect(t.en).toEqual({
      title: 'พนักงานบัญชี',
      location: null,
      description: 'English description',
      qualifications: null,
    });
    expect(t.zh).toBeUndefined();
  });

  it('maps the old form’s education labels to codes', () => {
    expect(educationLevelOf('Bachelor’s Degree')).toBe('BACHELOR');
    expect(educationLevelOf('Higher Vocational Certificate (High Voc. Cert.)')).toBe('HIGHER_VOCATIONAL_CERT');
    expect(educationLevelOf('Vocational Certificate (Voc. Cert.)')).toBe('VOCATIONAL_CERT');
    expect(educationLevelOf('Secondary School / High School')).toBe('HIGH_SCHOOL');
    expect(educationLevelOf('Incomplete / Did Not Graduate')).toBe('INCOMPLETE');
    expect(educationLevelOf('Master’s Degree')).toBe('MASTER');
    expect(educationLevelOf('')).toBeNull();
  });

  it('keeps only real months, dates and http(s) websites', () => {
    expect(yearMonthOf('2024-03')).toBe('2024-03');
    expect(yearMonthOf('')).toBeNull(); // the old backend saved "" for every month
    expect(dateOf('2026-12-01')).toBe('2026-12-01');
    expect(dateOf(null)).toBeNull();
    expect(websiteOf('www.linkedin.com/in/some-one')).toBe('https://www.linkedin.com/in/some-one');
    expect(websiteOf('https://example.com')).toBe('https://example.com');
    expect(websiteOf('-')).toBeNull();
    expect(websiteOf('javascript:alert(1)')).toBeNull();
    expect(text('  x  ')).toBe('x');
  });

  it('dedupes and caps skills like the form', () => {
    expect(skillsOf(['Excel', ' excel ', null, 'Word'])).toEqual(['Excel', 'Word']);
    expect(skillsOf(Array.from({ length: 12 }, (_, i) => `S${i}`))).toHaveLength(8);
  });

  it('reads old file urls', () => {
    const url =
      'https://yqofedmxrrurpjfaocys.supabase.co/storage/v1/object/public/careers/applications/abc/resume_My%20CV.pdf';
    expect(oldFileOf(url)).toEqual({ url, name: 'My CV.pdf' });
    expect(oldFileOf(url, 'portfolio.pdf')?.name).toBe('portfolio.pdf');
    expect(oldFileOf('storage:applications/abc/x.pdf')).toBeNull();
    expect(oldFileOf(null)).toBeNull();
  });
});
