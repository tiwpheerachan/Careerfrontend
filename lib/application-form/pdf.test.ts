import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { APPLICATION_FORM_LETTERHEADS } from '@/lib/constants';
import { applicationFormInput } from '@/tests/support/application-form';
import { renderApplicationFormPdf, splitSaraAm } from './pdf';
import { ApplicationFormInput } from './schema';

/**
 * The filled-in form comes out as one A4 page on each company's template.
 * PREVIEW_DIR=<folder> also writes the four PDFs there, to look at.
 */
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
      });
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expect(width).toBeCloseTo(595.3, 0);
      expect(height).toBeCloseTo(841.9, 0);
      if (process.env.PREVIEW_DIR) writeFileSync(path.join(process.env.PREVIEW_DIR, `${letterhead}.pdf`), bytes);
    });
  }
});

describe('splitSaraAm', () => {
  it('writes ำ as ํ + า, with a tone mark between them', () => {
    expect(splitSaraAm('จำกัด')).toBe('จํากัด');
    expect(splitSaraAm('น้ำ')).toBe('นํ้า');
    expect(splitSaraAm('ไม่มี')).toBe('ไม่มี');
  });
});
