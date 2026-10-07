import 'server-only';
import path from 'node:path';
import { Document, Font, Image, Page, Path, Svg, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import type { ReactNode } from 'react';
import type { EVALUATION_RESULTS, EVALUATOR_ROLES } from '@/lib/constants';
import en from '@/messages/admin/en.json';
import th from '@/messages/admin/th.json';
import zh from '@/messages/admin/zh.json';
import { splitSaraAm } from '@/lib/pdf/thai';
import { GENERAL_ITEMS, SCORE_LEVELS, SENIOR_ITEMS } from './scoring';

/**
 * The interview evaluation as the company's paper form (แบบฟอร์มประเมินผล
 * สัมภาษณ์ / 面试评估表): one page per candidate and evaluating side (HR, or
 * the hiring department), with the 1st and 2nd interview side by side — the
 * way the paper form has a column for each.
 *
 * The original is a Word document, so unlike the application form there is no
 * blank PDF to print onto: the layout is rebuilt here after it — the letterhead,
 * the candidate block, the 0–5 scale, the score table, the pass rule, and a
 * result and signature block per round. The signature itself is left blank,
 * to be signed on paper; the evaluator's name is printed under it.
 *
 * Thai, English or Chinese (the admin's languages); the text is the admin's
 * own messages (messages/admin/*.json → interviews.pdf). Sarabun draws Thai
 * and Latin, Noto Sans SC the Chinese — a fallback per glyph, so a Thai name
 * on the Chinese form still prints.
 */

export type PdfLanguage = 'th' | 'en' | 'zh';
type Role = (typeof EVALUATOR_ROLES)[number];
type Result = (typeof EVALUATION_RESULTS)[number];

/** One round's evaluation, as much of it as the PDF prints. */
export interface PrintedRound {
  interviewDate: string;
  senior: boolean;
  generalScores: number[];
  seniorScores: number[] | null;
  generalTotal: number;
  seniorTotal: number | null;
  total: number;
  meetsPassMark: boolean;
  result: Result;
  failReason: string | null;
  comment: string | null;
  evaluator: { email: string; name: string | null };
  updatedAt: Date;
}

export interface InterviewPdfInput {
  language: PdfLanguage;
  role: Role;
  candidate: { name: string; position: string | null; department: string | null };
  rounds: { 1?: PrintedRound; 2?: PrintedRound };
  printedAt: Date;
}

const ASSETS = path.join(process.cwd(), 'assets');
const LOGO = path.join(ASSETS, 'interview', 'shd-logo.png');

Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(ASSETS, 'fonts', 'Sarabun-Regular.ttf') },
    { src: path.join(ASSETS, 'fonts', 'Sarabun-Bold.ttf'), fontWeight: 'bold' },
  ],
});
// No bold Chinese face: bold Chinese text is drawn regular rather than failing.
Font.register({
  family: 'NotoSansSC',
  fonts: [
    { src: path.join(ASSETS, 'fonts', 'NotoSansSC-Regular.otf') },
    { src: path.join(ASSETS, 'fonts', 'NotoSansSC-Regular.otf'), fontWeight: 'bold' },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const MESSAGES = { th, en, zh } as const;
const INTL = { th: 'th-TH', en: 'en-GB', zh: 'zh-CN' } as const;

const INK = '#111827';
const MUTED = '#6b7280';
const LINE = '#9ca3af';
const PEN = '#1d3f9a';

const s = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 40,
    fontFamily: ['Sarabun', 'NotoSansSC'] as unknown as string,
    fontSize: 9,
    // One line height for every script: Chinese glyphs are taller than Thai, and
    // left to its own metrics the Chinese form ran onto a second page.
    lineHeight: 1.35,
    color: INK,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  company: { fontSize: 13, fontWeight: 'bold' },
  address: { fontSize: 7.5, color: MUTED, marginTop: 2, maxWidth: 360 },
  logo: { width: 96 },
  title: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 10.5, fontWeight: 'bold', marginTop: 10, marginBottom: 3 },
  fieldRow: { flexDirection: 'row', marginTop: 2 },
  fieldLabel: { width: 92, color: MUTED },
  fieldValue: { flex: 1, color: PEN, borderBottomWidth: 0.5, borderBottomColor: LINE, borderBottomStyle: 'dotted' },
  formFor: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  scale: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  table: { marginTop: 6, borderWidth: 0.6, borderColor: LINE },
  tr: { flexDirection: 'row', borderTopWidth: 0.6, borderTopColor: LINE, minHeight: 14 },
  th: { backgroundColor: '#f3f4f6', fontWeight: 'bold' },
  cellItem: { flex: 1, paddingHorizontal: 5, paddingVertical: 1.5 },
  cellScore: {
    width: 74,
    paddingVertical: 1.5,
    textAlign: 'center',
    borderLeftWidth: 0.6,
    borderLeftColor: LINE,
  },
  total: { fontWeight: 'bold' },
  note: { fontSize: 8.5, fontStyle: 'normal', marginTop: 6, marginBottom: 1, textDecoration: 'underline' },
  rules: {
    fontSize: 8.5,
    marginTop: 7,
    paddingVertical: 4,
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: INK,
  },
  rounds: { flexDirection: 'row', marginTop: 8, gap: 14 },
  round: { flex: 1 },
  roundTitle: { fontWeight: 'bold', marginBottom: 3 },
  choice: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  box: { width: 9, height: 9, borderWidth: 0.7, borderColor: INK, marginRight: 4 },
  reason: { color: PEN, marginLeft: 13, fontSize: 8.5 },
  comment: { marginTop: 4, fontSize: 8.5 },
  signature: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-end' },
  signLine: { flex: 1, borderBottomWidth: 0.6, borderBottomColor: INK, marginLeft: 4, height: 12 },
  signedName: { textAlign: 'center', marginTop: 3, color: PEN },
  dateValue: {
    flex: 1,
    marginLeft: 4,
    textAlign: 'center',
    color: PEN,
    borderBottomWidth: 0.6,
    borderBottomColor: INK,
  },
  printed: { position: 'absolute', bottom: 14, left: 40, right: 40 },
  printedText: { fontSize: 7, color: MUTED, textAlign: 'right' },
});

/** Text with the sara am fix applied to every string child. */
function T({ style, children }: { style?: Style | Style[]; children: ReactNode }) {
  const fix = (node: ReactNode): ReactNode =>
    typeof node === 'string' ? splitSaraAm(node) : Array.isArray(node) ? node.map(fix) : node;
  return <Text style={style}>{fix(children)}</Text>;
}

function Tick({ on }: { on: boolean }) {
  return (
    <View style={s.box}>
      {on ? (
        <Svg viewBox="0 0 10 10" style={{ width: 8, height: 8 }}>
          <Path d="M1.5 5.2 L4 7.6 L8.8 2" stroke={PEN} strokeWidth={1.5} fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

function InterviewForm({ input }: { input: InterviewPdfInput }) {
  const m = MESSAGES[input.language].interviews;
  const p = m.pdf;
  const date = (iso: string) =>
    new Intl.DateTimeFormat(INTL[input.language], { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  const r1 = input.rounds[1];
  const r2 = input.rounds[2];
  const senior = Boolean(r1?.senior || r2?.senior);
  const dates = [r1?.interviewDate, r2?.interviewDate]
    .filter((d): d is string => Boolean(d))
    .filter((d, i, all) => all.indexOf(d) === i)
    .map(date)
    .join(' / ');
  const scale = SCORE_LEVELS.map((level) => `${level}: ${m.scale[String(level) as keyof typeof m.scale]}`).join(', ');

  const scoreCell = (round: PrintedRound | undefined, list: 'general' | 'senior', i: number) => {
    const scores = list === 'general' ? round?.generalScores : round?.seniorScores;
    return <T style={[s.cellScore, { color: PEN }]}>{scores ? String(scores[i]) : ''}</T>;
  };

  const rows = (keys: readonly string[], list: 'general' | 'senior', offset: number) =>
    keys.map((key, i) => (
      <View key={key} style={s.tr} wrap={false}>
        <T style={s.cellItem}>{`${offset + i + 1}. ${m.items[key as keyof typeof m.items]}`}</T>
        {scoreCell(r1, list, i)}
        {scoreCell(r2, list, i)}
      </View>
    ));

  const totalRow = (label: string, pick: (r: PrintedRound) => number | null) => (
    <View style={[s.tr, s.th]}>
      <T style={[s.cellItem, s.total, { textAlign: 'right' }]}>{label}</T>
      <T style={[s.cellScore, s.total, { color: PEN }]}>{r1 && pick(r1) !== null ? String(pick(r1)) : ''}</T>
      <T style={[s.cellScore, s.total, { color: PEN }]}>{r2 && pick(r2) !== null ? String(pick(r2)) : ''}</T>
    </View>
  );

  const roundBlock = (title: string, round: PrintedRound | undefined) => (
    <View style={s.round} wrap={false}>
      <T style={s.roundTitle}>{title}</T>
      {(['PENDING', 'PASS', 'FAIL'] as const).map((result) => (
        <View key={result} style={s.choice}>
          <Tick on={round?.result === result} />
          <T>{m.form.results[result]}</T>
        </View>
      ))}
      {round?.result === 'FAIL' && round.failReason ? <T style={s.reason}>{round.failReason}</T> : null}
      {round?.comment ? <T style={s.comment}>{`${p.comment}: ${round.comment}`}</T> : null}
      <View style={s.signature}>
        <T>{p.signature}</T>
        <View style={s.signLine} />
      </View>
      <T
        style={s.signedName}
      >{`( ${round ? round.evaluator.name || round.evaluator.email : '                              '} )`}</T>
      <View style={[s.signature, { marginTop: 5 }]}>
        <T>{p.date}</T>
        <T style={s.dateValue}>{round ? date(round.interviewDate) : ' '}</T>
      </View>
    </View>
  );

  const printed = new Intl.DateTimeFormat(INTL[input.language], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(input.printedAt);

  return (
    <Document title={`${p.title} — ${input.candidate.name}`} producer="SHD Careers">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <T style={s.company}>{p.company}</T>
            <T style={s.address}>{p.address}</T>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img */}
          <Image src={LOGO} style={s.logo} />
        </View>
        <T style={s.title}>{p.title}</T>

        <T style={s.sectionTitle}>{p.candidateSection}</T>
        {(
          [
            [p.name, input.candidate.name],
            [p.position, input.candidate.position ?? ''],
            [p.department, input.candidate.department ?? ''],
            [p.interviewDate, dates],
          ] as const
        ).map(([label, value]) => (
          <View key={label} style={s.fieldRow}>
            <T style={s.fieldLabel}>{label}</T>
            <T style={s.fieldValue}>{value || ' '}</T>
          </View>
        ))}

        <T style={s.formFor}>{p.formFor[input.role]}</T>
        <T style={s.scale}>{p.scaleIntro}</T>
        <T style={s.scale}>{`(${scale})`}</T>

        <View style={s.table}>
          <View style={[s.tr, s.th, { borderTopWidth: 0 }]}>
            <T style={s.cellItem}>{p.item}</T>
            <T style={s.cellScore}>{p.round1}</T>
            <T style={s.cellScore}>{p.round2}</T>
          </View>
          {rows(GENERAL_ITEMS, 'general', 0)}
          {totalRow(p.generalTotal, (r) => r.generalTotal)}
        </View>

        <T style={s.note}>{p.seniorNote}</T>
        <View style={s.table}>
          {rows(SENIOR_ITEMS, 'senior', GENERAL_ITEMS.length)}
          {totalRow(p.seniorTotal, (r) => r.seniorTotal)}
          {senior ? totalRow(`${p.grandTotal} (75)`, (r) => (r.senior ? r.total : null)) : null}
        </View>

        <T style={s.rules}>{p.rules}</T>

        <T style={s.sectionTitle}>{p.conclusion}</T>
        <View style={s.rounds}>
          {roundBlock(p.opinion1, r1)}
          {roundBlock(p.opinion2, r2)}
        </View>

        <View style={s.printed} fixed>
          <T style={s.printedText}>{p.printed.replace('{date}', printed)}</T>
        </View>
      </Page>
    </Document>
  );
}

/** The filled-in form, as PDF bytes. */
export async function renderInterviewPdf(input: InterviewPdfInput): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<InterviewForm input={input} />));
}
