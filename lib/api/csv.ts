/**
 * CSV for Excel: UTF-8 with a BOM (so Thai shows correctly), CRLF lines, every
 * field quoted.
 *
 * A cell an applicant typed that starts with = + - @ (or a tab / carriage
 * return) is prefixed with ' so a spreadsheet shows it as text instead of
 * running it as a formula — "CSV injection". The old export did not do this.
 */
const FORMULA = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
