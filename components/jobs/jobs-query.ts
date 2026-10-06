/** The Jobs page's url: ?q=&country=TH&department=&level=&page=2. Empty means "all". */
export interface JobsQuery {
  q: string;
  /** ISO country code. */
  country: string;
  department: string;
  level: string;
  page: number;
}

export const PAGE_SIZE = 10;

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? '';

/** "ALL" is what the old page's selects wrote for "no filter"; links to it may still carry it. */
const filter = (v: string | string[] | undefined) => {
  const value = one(v);
  return value.toUpperCase() === 'ALL' ? '' : value;
};

export function parseJobsQuery(params: SearchParams): JobsQuery {
  const page = Number.parseInt(one(params.page), 10);
  return {
    q: one(params.q),
    country: filter(params.country).toUpperCase(),
    department: filter(params.department),
    level: filter(params.level),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

/** The query string for a JobsQuery — empty filters and page 1 left out. */
export function toQuery(query: JobsQuery): Record<string, string> {
  const out: Record<string, string> = {};
  if (query.q) out.q = query.q;
  if (query.country) out.country = query.country;
  if (query.department) out.department = query.department;
  if (query.level) out.level = query.level;
  if (query.page > 1) out.page = String(query.page);
  return out;
}

/** 1 … 4 5 6 … 12 — the old page's numbered pager. */
export function pageItems(page: number, totalPages: number): Array<number | '...'> {
  if (totalPages <= 1) return [];
  const p = Math.max(1, Math.min(totalPages, page));
  const items: Array<number | '...'> = [1];
  const left = Math.max(2, p - 1);
  const right = Math.min(totalPages - 1, p + 1);
  if (left > 2) items.push('...');
  for (let i = left; i <= right; i++) items.push(i);
  if (right < totalPages - 1) items.push('...');
  items.push(totalPages);
  return items.filter((it, i) => it !== items[i - 1]);
}
