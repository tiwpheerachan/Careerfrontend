import type { APPLICATION_FORM_LETTERHEADS } from '@/lib/constants';

/**
 * Where each answer goes on the company's blank form, in PDF points (A4,
 * 595.2 × 841.92), measured on the SHD template (assets/application-form/shd.pdf).
 *
 *   x, to   the dotted line the answer is written on, left to right
 *   y       the line's baseline, from the TOP of the page
 *
 * The four templates are the same form under different letterheads, so they
 * share the x positions and differ only in how far down the body starts —
 * `TEMPLATES[letterhead].shift`. The plain one has no "emergency contacts are
 * parents, children or spouse only" note, so its signature block moves up a
 * further line.
 *
 * Measured with a ruler drawn over the template (see docs/application-form.md);
 * re-measure there if a template is replaced.
 */
export interface Line {
  x: number;
  to: number;
  y: number;
}

/** A tick box: its centre. */
export interface Box {
  cx: number;
  cy: number;
}

type Letterhead = (typeof APPLICATION_FORM_LETTERHEADS)[number];

export const TEMPLATES: Record<Letterhead, { file: string; shift: { body: number; signature: number } }> = {
  SHD: { file: 'shd.pdf', shift: { body: 0, signature: 0 } },
  RABBIT: { file: 'rabbit.pdf', shift: { body: -28.2, signature: -28.2 } },
  TOPONE: { file: 'topone.pdf', shift: { body: -11.4, signature: -11.4 } },
  PLAIN: { file: 'plain.pdf', shift: { body: -41.7, signature: -59.3 } },
};

const line = (x: number, to: number, y: number): Line => ({ x, to, y });
const box = (cx: number, cy: number): Box => ({ cx, cy });

export const LAYOUT = {
  // 1.
  position: line(104, 276, 157.7),
  expectedSalary: line(350, 495, 157.7),
  // 2.
  nameTh: line(73, 215, 178.1),
  nameEn: line(286, 410, 178.1),
  nickname: line(438, 500, 178.1),
  gender: { MALE: box(514, 174.6), FEMALE: box(552, 174.6) },
  // 3.
  houseNo: line(97, 138, 196.1),
  moo: line(159, 185, 196.1),
  soi: line(204, 295, 196.1),
  road: line(318, 417, 196.1),
  subdistrict: line(461, 578, 196.1),
  district: line(62, 151, 214.1),
  province: line(178, 265, 214.1),
  postalCode: line(315, 372, 214.1),
  homePhone: line(420, 484, 214.1),
  mobile: line(508, 578, 214.1),
  email: line(54, 390, 231.7),
  // 4.
  birthDay: line(74, 93, 248.5),
  birthMonth: line(97, 119, 248.5),
  birthYear: line(123, 145, 248.5),
  age: line(162, 183, 248.5),
  bloodType: line(225, 249, 248.5),
  weight: line(281, 304, 248.5),
  height: line(341, 362, 248.5),
  ethnicity: line(411, 445, 248.5),
  nationality: line(477, 515, 248.5),
  religion: line(545, 580, 248.5),
  // 5.
  fatherName: line(48, 187, 266.5),
  fatherOccupation: line(209, 290, 266.5),
  motherName: line(327, 445, 266.5),
  motherOccupation: line(468, 580, 266.5),
  siblings: line(69, 169, 284.5),
  birthOrder: line(215, 306, 284.5),
  // 6.
  marital: {
    SINGLE: box(113.5, 299.8),
    MARRIED: box(152.5, 299.8),
    DIVORCED: box(199.6, 299.8),
    WIDOWED: box(239.4, 299.8),
  },
  spouseName: line(310, 409, 302.5),
  spouseMaidenName: line(460, 578, 302.5),
  children: line(50, 191, 320.7),
  spouseWorkplace: line(300, 578, 320.7),
  // 7.
  military: {
    SERVED: box(109.4, 336),
    DEFERRED: box(212, 336),
    RESERVIST: box(300, 336),
    BLACK_CARD: box(358.9, 336),
    EXEMPT: box(422, 336),
  },
  // 8. The table: one row per level, one column per field.
  educationRows: { SECONDARY: 393.7, DIPLOMA: 412.2, DEGREE: 430.7 },
  educationColumns: {
    institute: { x: 139, to: 252 },
    country: { x: 257, to: 333 },
    gpa: { x: 338, to: 384 },
    major: { x: 389, to: 495 },
    graduationYear: { x: 500, to: 576 },
  },
  // 9.
  language: line(97, 167, 467.4),
  speak: line(194, 263, 467.4),
  read: line(288, 356, 467.4),
  write: line(381, 434, 467.4),
  typingTh: line(98, 134, 485.4),
  typingEn: line(242, 279, 485.4),
  computer: line(82, 574, 503.4),
  motorcycle: { yes: box(242.5, 516.3), no: box(289, 516.3) },
  car: { yes: box(443, 516.3), no: box(487, 516.3) },
  // 10. The current job …
  currentCompany: line(91, 282, 563.4),
  currentPosition: line(315, 570, 563.4),
  currentDuties: line(110, 570, 581.4),
  currentFrom: line(80, 207, 599.4),
  currentTo: line(219, 321, 599.4),
  currentLastSalary: line(405, 554, 599.4),
  currentOtherIncome: line(206, 303, 617.5),
  currentTotalIncome: line(408, 554, 617.5),
  currentBenefits: line(110, 293, 635.5),
  currentReason: line(345, 575, 635.5),
  // … and the one before.
  previousCompany: line(55, 177, 664.3),
  previousPosition: line(211, 345, 664.3),
  previousLastSalary: line(404, 554, 664.3),
  previousFrom: line(80, 206, 682.3),
  previousTo: line(219, 325, 682.3),
  previousReason: line(375, 575, 682.3),
  // Emergency contact.
  emergencyName: line(112, 287, 711.6),
  emergencyRelationship: line(337, 425, 711.6),
  emergencyPhone: line(457, 580, 711.6),
  // The signature block (moves with `shift.signature`). The signature itself is left blank: it is signed on paper.
  signedName: line(350, 484, 802.6),
  signedDate: line(340, 510, 822.2),
} as const;
