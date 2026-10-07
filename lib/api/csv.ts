/**
 * CSV for Excel: UTF-8 with a BOM (so Thai shows correctly), CRLF lines, every
 * field quoted. Dates are Bangkok wall-clock time, "2026-10-06 13:16" — what
 * the admin shows, and a format Excel reads as a date.
 *
 * A cell an applicant typed that starts with = + - @ (or a tab / carriage
 * return) is prefixed with ' so a spreadsheet shows it as text instead of
 * running it as a formula — "CSV injection" (OWASP's rule). The old export did
 * not do this.
 *
 * Phone numbers are the exception, through asText(): "+66 81 234 5678" starts
 * with + — guarded with ' Excel would show the apostrophe, and unguarded it
 * would compute it (#NULL!, or a sum for "+66-81-…"); "0812345678" would lose
 * its 0. So a value made only of phone characters (digits, + ( ) . - space) is
 * written as ="+66 81 234 5678", which Excel, Google Sheets and LibreOffice all
 * show as exactly that text. It is a formula, but one this code writes around
 * a value that cannot contain a quote, a letter or anything else a formula
 * could use; anything else given to asText() gets the ' guard like any cell.
 */
const FORMULA = /^[=+\-@\t\r]/;
const PHONE = /^[+\d][\d ().-]*$/;
const TIME_ZONE = 'Asia/Bangkok';

const stamp = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "2026-10-06 13:16", in Bangkok. */
export function csvDateTime(date: Date): string {
  const part = Object.fromEntries(stamp.formatToParts(date).map((p) => [p.type, p.value]));
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`;
}

class TextCell {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
}

/** A value a spreadsheet must show as typed (a phone number) — see above. */
export const asText = (value: string | null | undefined) => (value ? new TextCell(value) : value);

const quote = (text: string) => `"${text.replace(/"/g, '""')}"`;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (value instanceof TextCell && PHONE.test(value.value)) return quote(`="${value.value}"`);
  let text = value instanceof TextCell ? value.value : value instanceof Date ? csvDateTime(value) : String(value);
  if (FORMULA.test(text)) text = `'${text}`;
  return quote(text);
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
