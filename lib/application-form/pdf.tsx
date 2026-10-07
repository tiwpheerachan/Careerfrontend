import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Document, Font, Page, Path, Svg, Text, renderToBuffer } from '@react-pdf/renderer';
import * as fontkit from 'fontkit';
import { PDFDocument } from 'pdf-lib';
import type { APPLICATION_FORM_LETTERHEADS } from '@/lib/constants';
import { splitSaraAm } from '@/lib/pdf/thai';
import { LAYOUT, TEMPLATES, type Box, type Line } from './layout';
import type { ApplicationFormAnswers, ApplicationFormSensitive } from './schema';

/**
 * The filled-in application form as a PDF: the company's own blank form, with
 * the answers written onto its dotted lines and ticks in its boxes.
 *
 * Two layers. The blank form is the original PDF, untouched (letterhead,
 * lines, boxes — vector, exactly as HR prints it today). The answers are a
 * second, transparent page drawn by @react-pdf/renderer and laid over it with
 * pdf-lib. Two libraries because neither does both: pdf-lib cannot shape Thai
 * (its tone marks and upper vowels come out missing or stacked wrong), and
 * react-pdf cannot open an existing PDF.
 *
 * The photo box and the signature are left blank — the form is signed, and the
 * photo attached, on paper at the interview.
 */

type Letterhead = (typeof APPLICATION_FORM_LETTERHEADS)[number];

export interface PrintableForm {
  letterhead: Letterhead;
  /** The job's title, or what the applicant wrote. */
  position: string;
  answers: ApplicationFormAnswers;
  /** Null without consent — or for an admin without manage, who prints without it. */
  sensitive: ApplicationFormSensitive | null;
  submittedAt: Date;
  /**
   * For someone who is only interviewing: no address, phone or email, no
   * family or emergency contact, and the age instead of the birth date. What
   * the applicant can do stays; how to reach them, and their family, does not.
   */
  redact?: boolean;
}

const ASSETS = path.join(process.cwd(), 'assets');
const FONT_FILE = path.join(ASSETS, 'fonts', 'Sarabun-Regular.ttf');
const FAMILY = 'Sarabun';
/** Pen blue, so the answers read as filled in, not as part of the form. */
const INK = '#1d3f9a';
const SIZE = 10;
const MIN_SIZE = 6.5;
/** How far above the dotted line the text sits. */
const LIFT = 1.5;

Font.register({ family: FAMILY, src: FONT_FILE });
// Thai has no spaces between words; never let react-pdf hyphenate inside one.
Font.registerHyphenationCallback((word) => [word]);

let metrics: fontkit.Font | undefined;
async function font(): Promise<fontkit.Font> {
  if (!metrics) metrics = fontkit.create(await readFile(FONT_FILE)) as fontkit.Font;
  return metrics;
}

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const SKILL = { FAIR: 'พอใช้', GOOD: 'ดี', EXCELLENT: 'ดีมาก' } as const;

/** 2026-03 → "มี.ค. 2569". */
function monthTh(value: string | null): string | null {
  if (!value) return null;
  const [year, month] = value.split('-').map(Number);
  return `${THAI_MONTHS[month! - 1]} ${year! + 543}`;
}

/** Whole years between a birth date and a day. */
function ageOn(birthDate: string, day: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = day.getFullYear() - y!;
  if (day.getMonth() + 1 < m! || (day.getMonth() + 1 === m && day.getDate() < d!)) age--;
  return age;
}

const str = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? null : String(value);

type Placed = { kind: 'text'; text: string; line: Line } | { kind: 'tick'; box: Box };

/** Everything to write, at its place on the SHD template. Exported for the tests. */
export function placements(form: PrintableForm): Placed[] {
  const a = form.answers;
  const out: Placed[] = [];
  const put = (line: Line, value: string | number | null | undefined) => {
    const text = str(value);
    if (text) out.push({ kind: 'text', text, line });
  };
  const tick = (target: Box | undefined) => {
    if (target) out.push({ kind: 'tick', box: target });
  };
  const L = LAYOUT;

  put(L.position, form.position);
  put(L.expectedSalary, a.expectedSalary);

  put(L.nameTh, a.nameTh);
  put(L.nameEn, a.nameEn);
  put(L.nickname, a.nickname);
  if (a.gender) tick(L.gender[a.gender]);

  const hide = Boolean(form.redact);
  // Leaves a line blank when the form is redacted.
  const own = (line: Line, value: string | number | null | undefined) => put(line, hide ? null : value);

  own(L.houseNo, a.address.houseNo);
  own(L.moo, a.address.moo);
  own(L.soi, a.address.soi);
  own(L.road, a.address.road);
  put(L.subdistrict, a.address.subdistrict);
  put(L.district, a.address.district);
  put(L.province, a.address.province);
  put(L.postalCode, a.address.postalCode);
  own(L.homePhone, a.homePhone);
  own(L.mobile, a.mobile);
  own(L.email, a.email);

  const [year, month, day] = a.birthDate.split('-').map(Number);
  own(L.birthDay, day);
  own(L.birthMonth, month);
  own(L.birthYear, year! + 543);
  put(L.age, ageOn(a.birthDate, form.submittedAt));
  put(L.nationality, a.nationality);
  if (form.sensitive) {
    put(L.bloodType, form.sensitive.bloodType);
    put(L.weight, form.sensitive.weightKg);
    put(L.height, form.sensitive.heightCm);
    put(L.ethnicity, form.sensitive.ethnicity);
    put(L.religion, form.sensitive.religion);
  }

  own(L.fatherName, a.family.fatherName);
  own(L.fatherOccupation, a.family.fatherOccupation);
  own(L.motherName, a.family.motherName);
  own(L.motherOccupation, a.family.motherOccupation);
  own(L.siblings, a.family.siblings);
  own(L.birthOrder, a.family.birthOrder);

  if (a.marriage.status) tick(L.marital[a.marriage.status]);
  own(L.spouseName, a.marriage.spouseName);
  own(L.spouseMaidenName, a.marriage.spouseMaidenName);
  own(L.children, a.marriage.children);
  own(L.spouseWorkplace, a.marriage.spouseWorkplace);

  if (a.military) tick(L.military[a.military]);

  for (const row of a.education) {
    const y = L.educationRows[row.level];
    for (const [field, column] of Object.entries(L.educationColumns)) {
      put({ ...column, y }, row[field as keyof typeof L.educationColumns]);
    }
  }

  const s = a.skills;
  put(L.language, s.language);
  put(L.speak, s.speak && SKILL[s.speak]);
  put(L.read, s.read && SKILL[s.read]);
  put(L.write, s.write && SKILL[s.write]);
  put(L.typingTh, s.typingThWpm);
  put(L.typingEn, s.typingEnWpm);
  put(L.computer, s.computer);
  if (s.motorcycleLicense !== null) tick(s.motorcycleLicense ? L.motorcycle.yes : L.motorcycle.no);
  if (s.carLicense !== null) tick(s.carLicense ? L.car.yes : L.car.no);

  const now = a.currentJob;
  if (now) {
    put(L.currentCompany, now.company);
    put(L.currentPosition, now.position);
    put(L.currentDuties, now.duties);
    put(L.currentFrom, monthTh(now.from));
    put(L.currentTo, monthTh(now.to) ?? (now.from ? 'ปัจจุบัน' : null));
    put(L.currentLastSalary, now.lastSalary);
    put(L.currentOtherIncome, now.otherIncome);
    put(L.currentTotalIncome, now.totalIncome);
    put(L.currentBenefits, now.benefits);
    put(L.currentReason, now.reasonForLeaving);
  }
  const before = a.previousJob;
  if (before) {
    put(L.previousCompany, before.company);
    put(L.previousPosition, before.position);
    put(L.previousLastSalary, before.lastSalary);
    put(L.previousFrom, monthTh(before.from));
    put(L.previousTo, monthTh(before.to));
    put(L.previousReason, before.reasonForLeaving);
  }

  own(L.emergencyName, a.emergency.name);
  own(L.emergencyRelationship, a.emergency.relationship);
  own(L.emergencyPhone, a.emergency.phone);

  put(L.signedName, a.nameTh);
  const d = form.submittedAt;
  put(L.signedDate, `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`);
  return out;
}

/** The largest size, down to MIN_SIZE, at which the text fits its line; past that, cut with "…". */
function fit(f: fontkit.Font, text: string, width: number): { text: string; size: number } {
  const widthAt = (t: string, size: number) => (f.layout(t).advanceWidth / f.unitsPerEm) * size;
  for (let size = SIZE; size >= MIN_SIZE; size -= 0.5) {
    if (widthAt(text, size) <= width) return { text, size };
  }
  let cut = text;
  while (cut.length > 1 && widthAt(`${cut}…`, MIN_SIZE) > width) cut = cut.slice(0, -1);
  return { text: `${cut}…`, size: MIN_SIZE };
}

/** The answers layer: a transparent A4 page, positioned for one template. */
async function answersLayer(form: PrintableForm): Promise<Buffer> {
  const f = await font();
  const ascent = f.ascent / f.unitsPerEm;
  const { shift } = TEMPLATES[form.letterhead];
  // The signature block moves on its own on the plain template (see layout.ts).
  const signatureYs = new Set([LAYOUT.signedName.y, LAYOUT.signedDate.y]);

  const children = placements(form).map((item, i) => {
    if (item.kind === 'tick') {
      const cy = item.box.cy + shift.body;
      return (
        <Svg
          key={i}
          viewBox="0 0 10 10"
          style={{ position: 'absolute', left: item.box.cx - 5, top: cy - 5, width: 10, height: 10 }}
        >
          <Path d="M1.5 5.2 L4 7.8 L8.8 2" stroke={INK} strokeWidth={1.4} fill="none" />
        </Svg>
      );
    }
    const { line } = item;
    const y = line.y + (signatureYs.has(line.y) ? shift.signature : shift.body);
    const { text, size } = fit(f, splitSaraAm(item.text), line.to - line.x);
    return (
      <Text
        key={i}
        style={{
          position: 'absolute',
          left: line.x,
          top: y - LIFT - ascent * size,
          fontFamily: FAMILY,
          fontSize: size,
          lineHeight: 1,
          color: INK,
        }}
      >
        {text}
      </Text>
    );
  });

  return renderToBuffer(
    <Document>
      <Page size={[595.2, 841.92]}>{children}</Page>
    </Document>,
  );
}

/** The filled-in form, one A4 page. */
export async function renderApplicationFormPdf(form: PrintableForm): Promise<Uint8Array> {
  const [template, layer] = await Promise.all([
    readFile(path.join(ASSETS, 'application-form', TEMPLATES[form.letterhead].file)),
    answersLayer(form),
  ]);
  const doc = await PDFDocument.load(template);
  const [answers] = await doc.embedPdf(layer);
  doc.getPage(0).drawPage(answers!, { x: 0, y: 0 });
  doc.setTitle(`ใบสมัครงาน — ${form.answers.nameTh}`);
  doc.setProducer('SHD Careers');
  return doc.save();
}
