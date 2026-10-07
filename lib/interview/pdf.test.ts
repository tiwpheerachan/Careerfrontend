import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { renderInterviewPdf, type PrintedRound } from './pdf';
import { outcomeOf } from './scoring';

/**
 * One A4 page in each language. PREVIEW_DIR=<folder> also writes them there.
 */
const round = (overrides: Partial<PrintedRound> & Pick<PrintedRound, 'generalScores'>): PrintedRound => {
  const seniorScores = overrides.seniorScores ?? null;
  const outcome = outcomeOf({ general: overrides.generalScores, senior: seniorScores });
  return {
    interviewDate: '2026-10-07',
    senior: seniorScores !== null,
    seniorScores,
    result: 'PASS',
    failReason: null,
    comment: null,
    evaluator: { email: 'hr@shd-technology.co.th', name: 'สมศรี ฝ่ายบุคคล' },
    updatedAt: new Date('2026-10-07T10:00:00+07:00'),
    ...outcome,
    ...overrides,
  };
};

describe('the interview evaluation PDF', () => {
  for (const language of ['th', 'en', 'zh'] as const) {
    it(`${language}: one A4 page`, async () => {
      const bytes = await renderInterviewPdf({
        language,
        role: language === 'zh' ? 'DEPARTMENT' : 'HR',
        candidate: {
          name: 'นางสาวสุภาวดี ศรีสุข (น้ำ)',
          position: 'Accounting Officer (AR)',
          department: 'Accounting',
        },
        rounds: {
          1: round({
            generalScores: [4, 4, 5, 4, 4, 3, 4, 4, 4, 3],
            seniorScores: [5, 4, 4, 4, 4],
            comment: 'สื่อสารดี มีประสบการณ์ตรงสายงาน วางแผนงานได้ชัดเจน',
          }),
          2: round({
            interviewDate: '2026-10-14',
            generalScores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            seniorScores: [4, 4, 4, 4, 4],
            result: 'FAIL',
            failReason: 'ประสบการณ์การบริหารทีมยังไม่เพียงพอ',
            evaluator: { email: 'head@shd-technology.co.th', name: '王经理' },
          }),
        },
        printedAt: new Date('2026-10-15T09:30:00+07:00'),
      });
      const doc = await PDFDocument.load(bytes);
      if (process.env.PREVIEW_DIR)
        writeFileSync(path.join(process.env.PREVIEW_DIR, `interview-${language}.pdf`), bytes);
      expect(doc.getPageCount()).toBe(1);
    });
  }
});
