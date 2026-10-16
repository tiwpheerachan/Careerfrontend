import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { APPLICATION_FORM_LETTERHEADS } from '@/lib/constants';
import { applicationFormInput } from '@/tests/support/application-form';
import { splitSaraAm } from '@/lib/pdf/thai';
import { placements, renderApplicationFormPdf } from './pdf';
import { ApplicationFormInput } from './schema';

/**
 * The filled-in form comes out as one A4 page on each company's template.
 * PREVIEW_DIR=<folder> also writes the four PDFs there, to look at.
 */
/** A 1×1 PNG: enough to show the photo is embedded into its box on every template. */
const PHOTO = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

describe('the application form PDF', () => {
  const data = ApplicationFormInput.parse(applicationFormInput());
  const {
    locale: _l,
    letterhead: _h,
    jobCode: _j,
    positionOther,
    sensitiveConsent: _c,
    sensitive,
    certified: _x,
    turnstileToken: _t,
    ...answers
  } = data;

  for (const letterhead of APPLICATION_FORM_LETTERHEADS) {
    it(`${letterhead}: one A4 page`, async () => {
      const bytes = await renderApplicationFormPdf({
        letterhead,
        position: positionOther!,
        answers,
        sensitive: sensitive ?? null,
        submittedAt: new Date('2026-10-07T10:00:00+07:00'),
        photo: { bytes: PHOTO, png: true },
      });
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expect(width).toBeCloseTo(595.3, 0);
      expect(height).toBeCloseTo(841.9, 0);
      if (process.env.PREVIEW_DIR) writeFileSync(path.join(process.env.PREVIEW_DIR, `${letterhead}.pdf`), bytes);
    });
  }

  it('redacted (for an invited interviewer): no contact, family or birth date; the age and work stay', () => {
    const form = {
      letterhead: APPLICATION_FORM_LETTERHEADS[0],
      position: positionOther!,
      answers,
      sensitive: null,
      submittedAt: new Date('2026-10-07T10:00:00+07:00'),
    };
    const texts = (redact: boolean) =>
      placements({ ...form, redact }).flatMap((p) => (p.kind === 'text' ? [p.text] : []));
    const full = texts(false);
    const redacted = texts(true);
    const hidden = [
      answers.mobile,
      answers.email,
      answers.address.houseNo,
      answers.family.fatherName,
      answers.emergency.name,
      answers.emergency.phone,
    ].filter((v): v is string => Boolean(v));
    expect(hidden.length).toBeGreaterThan(3);
    for (const value of hidden) {
      expect(full).toContain(value);
      expect(redacted).not.toContain(value);
    }
    expect(redacted).toContain(answers.nameTh);

    // The title prints before each name, in that name's language.
    const titled = placements({ ...form, answers: { ...answers, nameTitle: 'MISS' } }).flatMap((p) =>
      p.kind === 'text' ? [p.text] : [],
    );
    expect(titled).toContain(`นางสาว${answers.nameTh}`);
    if (answers.nameEn) expect(titled).toContain(`Miss ${answers.nameEn}`);
    expect(redacted).toContain(positionOther);
    expect(redacted.length).toBeGreaterThan(10);
  });

  it('languages share the one row in order; a form from before `languages` still prints; both nicknames', () => {
    const form = {
      letterhead: APPLICATION_FORM_LETTERHEADS[0],
      position: positionOther!,
      answers,
      sensitive: null,
      submittedAt: new Date('2026-10-07T10:00:00+07:00'),
    };
    const texts = (a: typeof answers) =>
      placements({ ...form, answers: a }).flatMap((p) => (p.kind === 'text' ? [p.text] : []));
    const now = texts(answers);
    expect(now).toEqual(expect.arrayContaining(['อังกฤษ / จีน', 'ดี / พอใช้', 'ดีมาก / -', 'ปุ้ย (Pui)']));

    const other = texts({
      ...answers,
      skills: {
        ...answers.skills,
        languages: [{ language: 'OTHER', other: 'ญี่ปุ่น', speak: 'FAIR', read: null, write: null }],
      },
    });
    expect(other).toEqual(expect.arrayContaining(['ญี่ปุ่น', 'พอใช้']));

    const legacy = { ...answers, skills: { ...answers.skills, languages: [], language: 'ฝรั่งเศส', speak: 'GOOD' } };
    expect(texts(legacy as typeof answers)).toEqual(expect.arrayContaining(['ฝรั่งเศส', 'ดี']));
    expect(texts({ ...answers, nicknameEn: null })).toContain('ปุ้ย');
  });
});

describe('splitSaraAm', () => {
  it('writes ำ as ํ + า, with a tone mark between them', () => {
    expect(splitSaraAm('จำกัด')).toBe('จํากัด');
    expect(splitSaraAm('น้ำ')).toBe('นํ้า');
    expect(splitSaraAm('ไม่มี')).toBe('ไม่มี');
  });
});
