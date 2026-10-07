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
    round: 1,
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
        evaluations: [
          round({
            generalScores: [4, 4, 5, 4, 4, 3, 4, 4, 4, 3],
            seniorScores: [5, 4, 4, 4, 4],
            comment: 'สื่อสารดี มีประสบการณ์ตรงสายงาน วางแผนงานได้ชัดเจน',
          }),
          round({
            round: 2,
            interviewDate: '2026-10-14',
            generalScores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
            seniorScores: [4, 4, 4, 4, 4],
            result: 'FAIL',
            failReason: 'ประสบการณ์การบริหารทีมยังไม่เพียงพอ',
            evaluator: { email: 'head@shd-technology.co.th', name: '王经理' },
          }),
        ],
        printedAt: new Date('2026-10-15T09:30:00+07:00'),
      });
      const doc = await PDFDocument.load(bytes);
      if (process.env.PREVIEW_DIR)
        writeFileSync(path.join(process.env.PREVIEW_DIR, `interview-${language}.pdf`), bytes);
      expect(doc.getPageCount()).toBe(1);
    });
  }

  const pageTexts = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

  it('a long comment wraps and stays on one page, with the edit noted', async () => {
    const long = 'ผู้สมัครมีทักษะการสื่อสารที่ดีมากและมีประสบการณ์ตรงกับสายงานบัญชีลูกหนี้มากกว่าห้าปี'.repeat(2);
    const bytes = await renderInterviewPdf({
      language: 'th',
      role: 'HR',
      candidate: { name: 'นายทดสอบ ยาวมาก', position: 'Accounting Officer', department: null },
      evaluations: [
        round({
          generalScores: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          comment: long,
          edited: { by: 'manager@shd-technology.co.th', at: new Date('2026-10-08T09:00:00+07:00') },
        }),
      ],
      printedAt: new Date('2026-10-15T09:30:00+07:00'),
    });
    if (process.env.PREVIEW_DIR) writeFileSync(path.join(process.env.PREVIEW_DIR, 'interview-long.pdf'), bytes);
    expect(await pageTexts(bytes)).toBe(1);
  });

  it('several evaluators in a round: a summary page, then one page each', async () => {
    const people = [
      { email: 'a@shd-technology.co.th', name: 'คนที่หนึ่ง' },
      { email: 'b@shd-technology.co.th', name: 'คนที่สอง' },
      { email: 'c@shd-technology.co.th', name: 'คนที่สาม' },
    ];
    const bytes = await renderInterviewPdf({
      language: 'th',
      role: 'DEPARTMENT',
      candidate: { name: 'นางสาวทดสอบ', position: 'Engineer', department: 'R&D' },
      evaluations: [
        round({ generalScores: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], evaluator: people[0]! }),
        round({ generalScores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], evaluator: people[1]!, viaInvitation: true }),
        // An older evaluation by the same person in the same round is not printed.
        round({
          generalScores: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
          evaluator: people[1]!,
          updatedAt: new Date('2026-10-01T10:00:00+07:00'),
        }),
        round({ round: 2, generalScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], evaluator: people[2]! }),
      ],
      printedAt: new Date('2026-10-15T09:30:00+07:00'),
    });
    if (process.env.PREVIEW_DIR) writeFileSync(path.join(process.env.PREVIEW_DIR, 'interview-many.pdf'), bytes);
    expect(await pageTexts(bytes)).toBe(1 + people.length);
  });
});
