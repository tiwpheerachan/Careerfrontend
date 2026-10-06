import type { ApplicationStage, EducationLevel, JobPublishState, Locale } from '@/lib/db/schema';

/**
 * The old system's rows (Supabase project yqofedmxrrurpjfaocys, backend/
 * migrations 000–003) turned into the new schema's values. Pure functions:
 * scripts/import-legacy.ts does the reading and writing, these decide what
 * each old value becomes — and lib/legacy/map.test.ts pins every rule.
 */

// --- Jobs --------------------------------------------------------------------------

/**
 * A clean job code from the old free-text job_id:
 * "SHD-TH- Accounting - AP" → "SHD-TH-ACCOUNTING-AP",
 * "SHD-TH- Videographer & Video Editor" → "SHD-TH-VIDEOGRAPHER-VIDEO-EDITOR".
 * Anything that is not a letter or digit becomes one hyphen.
 */
export function cleanJobCode(oldJobId: string): string {
  const code = oldJobId
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!/^[A-Z0-9][A-Z0-9_-]{1,63}$/.test(code)) throw new Error(`Cannot make a job code from "${oldJobId}"`);
  return code;
}

const COUNTRY_CODES: Record<string, string> = {
  thailand: 'TH',
  ประเทศไทย: 'TH',
  ไทย: 'TH',
  china: 'CN',
  indonesia: 'ID',
  philippines: 'PH',
  vietnam: 'VN',
  'viet nam': 'VN',
  brazil: 'BR',
  mexico: 'MX',
  malaysia: 'MY',
  singapore: 'SG',
};

/** "Thailand" → "TH". An unknown or empty country is an error — the import stops rather than guess. */
export function countryCodeOf(country: string | null): string {
  const key = (country ?? '').trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  const code = COUNTRY_CODES[key];
  if (!code) throw new Error(`Unknown country "${country}" — add it to COUNTRY_CODES in lib/legacy/map.ts`);
  return code;
}

export function publishStateOf(status: string | null): JobPublishState {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'published':
      return 'PUBLISHED';
    case 'closed':
      return 'CLOSED';
    default:
      return 'DRAFT';
  }
}

/** Trimmed text, or null for empty / whitespace / a lone dash. */
export function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' || trimmed === '-' ? null : trimmed;
}

export interface OldJob {
  job_id: string;
  title_th: string | null;
  title_en: string | null;
  title_zh: string | null;
  location_th: string | null;
  location_en: string | null;
  location_zh: string | null;
  desc_th: string | null;
  desc_en: string | null;
  desc_zh: string | null;
  qual_th: string | null;
  qual_en: string | null;
  qual_zh: string | null;
}

export interface JobText {
  title: string;
  location: string | null;
  description: string | null;
  qualifications: string | null;
}

/**
 * The per-language text of an old job. A language with any text gets a
 * translation; when it has text but no title, the title is borrowed from
 * another language (th → en → zh) — which is what the old site showed, as it
 * fell back field by field.
 */
export function translationsOf(job: OldJob): Partial<Record<Locale, JobText>> {
  const any = text(job.title_th) ?? text(job.title_en) ?? text(job.title_zh);
  const out: Partial<Record<Locale, JobText>> = {};
  for (const locale of ['th', 'en', 'zh'] as const) {
    const title = text(job[`title_${locale}`]);
    const location = text(job[`location_${locale}`]);
    const description = text(job[`desc_${locale}`]);
    const qualifications = text(job[`qual_${locale}`]);
    if (!title && !location && !description && !qualifications) continue;
    const borrowed = title ?? any;
    if (!borrowed) continue;
    out[locale] = { title: borrowed, location, description, qualifications };
  }
  return out;
}

// --- Applications ------------------------------------------------------------------

export function stageOf(status: string | null): ApplicationStage {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'reviewing':
      return 'REVIEWING';
    case 'shortlisted':
      return 'SHORTLISTED';
    case 'rejected':
      return 'REJECTED';
    case 'hired':
      return 'HIRED';
    default:
      return 'NEW'; // includes NULL, which the old admin also showed as "new"
  }
}

/** The old form's English labels (frontend/src/pages/ApplyPage.tsx EDUCATION_LEVELS) → codes. */
const EDUCATION_LEVELS: Array<[RegExp, EducationLevel]> = [
  [/high school|secondary/i, 'HIGH_SCHOOL'],
  [/higher vocational|high voc/i, 'HIGHER_VOCATIONAL_CERT'],
  [/vocational/i, 'VOCATIONAL_CERT'],
  [/diploma|associate/i, 'DIPLOMA'],
  [/bachelor/i, 'BACHELOR'],
  [/master/i, 'MASTER'],
  [/doctor|phd|dba|edd/i, 'DOCTORATE'],
  [/currently studying/i, 'STUDYING'],
  [/incomplete|did not graduate/i, 'INCOMPLETE'],
  [/other|equivalent/i, 'OTHER'],
];

export function educationLevelOf(label: string | null): EducationLevel | null {
  const value = text(label);
  if (!value) return null;
  return EDUCATION_LEVELS.find(([pattern]) => pattern.test(value))?.[1] ?? 'OTHER';
}

/** "2024-03" stays; anything else (the old backend saved "") becomes null. */
export function yearMonthOf(value: string | null): string | null {
  const v = text(value);
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null;
}

/** "2026-12-01" stays; anything else becomes null. */
export function dateOf(value: string | null): string | null {
  const v = text(value);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
}

/**
 * The new schema takes http(s) only. A bare domain ("www.linkedin.com/in/x")
 * gets https://; anything that is not a url ("-") is dropped.
 */
export function websiteOf(value: string | null): string | null {
  const v = text(value);
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v) ? `https://${v}` : null;
  if (!withScheme) return null;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? withScheme : null;
  } catch {
    return null;
  }
}

/** Skills trimmed, case-insensitive duplicates dropped (first spelling wins), at most 8 — the form's limit. */
export function skillsOf(values: Array<string | null>): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const skill = text(raw)?.slice(0, 60);
    if (skill && !out.some((s) => s.toLowerCase() === skill.toLowerCase())) out.push(skill);
  }
  return out.slice(0, 8);
}

/**
 * Where an old file lives, from the url the old backend stored:
 * https://<old>.supabase.co/storage/v1/object/public/careers/applications/<id>/resume_cv.pdf
 * → { url, name: "cv.pdf" } (the backend's resume_/transcript_/att_ prefix removed).
 */
export function oldFileOf(url: string | null, fallbackName?: string | null): { url: string; name: string } | null {
  const v = text(url);
  if (!v || !/^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//.test(v)) return null;
  const base = decodeURIComponent(v.split('/').pop() ?? 'file');
  const name = text(fallbackName) ?? base.replace(/^(resume|transcript|att)_/, '');
  return { url: v, name: name || 'file' };
}
