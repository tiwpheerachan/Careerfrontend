import type { ReactNode } from 'react';
import type { AdminLocale } from '@/lib/i18n/admin';

/** A label over a value ("—" when there is none) — the old detail page's Field. */
export function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium tracking-wide text-gray-400 uppercase">{label}</div>
      <div className="mt-0.5 text-sm break-words text-gray-900">{value || '—'}</div>
    </div>
  );
}

/** A white card with a small bold title — the old Section. */
export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** "2024-03" → "มี.ค. 2567" / "Mar 2024". */
export function formatMonth(ym: string | null, locale: AdminLocale): string | null {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function monthRange(start: string | null, end: string | null, locale: AdminLocale): string {
  return [formatMonth(start, locale), formatMonth(end, locale)].filter(Boolean).join(' – ');
}

/** 77 B, 12.3 KB, 1.4 MB. */
export function formatSize(bytes: number, locale: AdminLocale): string {
  const n = (value: number, digits: number) =>
    new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-GB', { maximumFractionDigits: digits }).format(value);
  if (bytes < 1024) return `${n(bytes, 0)} B`;
  if (bytes < 1024 * 1024) return `${n(bytes / 1024, 1)} KB`;
  return `${n(bytes / (1024 * 1024), 1)} MB`;
}

/** The language a form was filled in, named in the admin's language ("อังกฤษ" / "English"). */
export function languageName(code: string, locale: AdminLocale): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
