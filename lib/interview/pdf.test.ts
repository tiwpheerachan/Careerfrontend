import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { renderInterviewPdf, type PrintedRound } from './pdf';
import { outcomeOf } from './scoring';

/**
 * The form on one A4 page in each language, the comments on a page of their
 * own after it. PREVIEW_DIR=<folder> also writes them there.
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
    it(`${language}: the form on one A4 page, the comment on the next`, async () => {
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
      expect(doc.getPageCount()).toBe(2);
    });
  }

  const pageTexts = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

  it('a long comment does not push the form onto a second page; the edit is noted', async () => {
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
    expect(await pageTexts(bytes)).toBe(2); // the form, then the comment
  });

  it('comments at the 2000-character limit: the form untouched, the comments after it', async () => {
    // One unbroken run, as someone typed it: wrapped by character, not lost.
    const longest = 'testsgl;dfsgldlgkdfgl;kdf;gkd;'.repeat(67).slice(0, 2000);
    const bytes = await renderInterviewPdf({
      language: 'th',
      role: 'DEPARTMENT',
      candidate: { name: 'นายทดสอบ ระบบฟอร์ม', position: 'Accounting Officer', department: null },
      evaluations: [
        round({ generalScores: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], result: 'PENDING', comment: longest }),
        round({ round: 2, generalScores: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], comment: longest }),
      ],
      printedAt: new Date('2026-10-15T09:30:00+07:00'),
    });
    if (process.env.PREVIEW_DIR) writeFileSync(path.join(process.env.PREVIEW_DIR, 'interview-comments.pdf'), bytes);
    expect(await pageTexts(bytes)).toBe(2); // the form, then both comments
  });

  it('more comments than a page holds flow on, each opening with its heading and author', async () => {
    const longest = 'ผู้สมัครมีทักษะการสื่อสารที่ดีและมีประสบการณ์ตรงสายงาน '.repeat(40).slice(0, 2000);
    const people = ['หนึ่ง', 'สอง', 'สาม'].map((name) => ({ email: `${name}@shd-technology.co.th`, name }));
    const bytes = await renderInterviewPdf({
      language: 'th',
      role: 'DEPARTMENT',
      candidate: { name: 'นายทดสอบ ยาวมาก', position: 'Engineer', department: null },
      evaluations: [
        round({ generalScores: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4], evaluator: people[0]!, comment: longest }),
        round({ generalScores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], evaluator: people[1]!, comment: longest }),
        round({ round: 2, generalScores: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5], evaluator: people[2]!, comment: longest }),
      ],
      printedAt: new Date('2026-10-15T09:30:00+07:00'),
    });
    if (process.env.PREVIEW_DIR)
      writeFileSync(path.join(process.env.PREVIEW_DIR, 'interview-comments-flow.pdf'), bytes);
    // The summary, a form each, and the comments over two pages.
    expect(await pageTexts(bytes)).toBe(1 + people.length + 2);
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
        round({
          generalScores: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
          evaluator: people[0]!,
          comment: 'ตอบคำถามได้ตรงประเด็น',
        }),
        round({
          generalScores: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
          evaluator: people[1]!,
          viaInvitation: true,
          comment: 'ควรสัมภาษณ์เพิ่มเรื่องการบริหารทีม',
        }),
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
    // The summary, a form per evaluator, and one page with every comment ("from" whom).
    expect(await pageTexts(bytes)).toBe(1 + people.length + 1);
  });
});
