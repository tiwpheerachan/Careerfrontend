import { APPLICATION_STAGES } from '@/lib/constants';
import type { ApplicationStage } from '@/lib/constants-types';

/**
 * The applicants list keeps all of its state in the url:
 * ?q=&stage=&jobId=&page=&pageSize=&sort=&dir=
 * Parsed leniently (a bad value falls back to the default) so a hand-edited or
 * stale link still opens a list.
 */
export const SORTS = ['createdAt', 'name', 'stage', 'job'] as const;
export type SortKey = (typeof SORTS)[number];
export type SortDir = 'asc' | 'desc';
export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export interface ListQuery {
  q: string;
  stage: ApplicationStage | null;
  jobId: string | null;
  page: number;
  pageSize: number;
  sort: SortKey | null;
  dir: SortDir | null;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export function parseListQuery(raw: Raw | URLSearchParams): ListQuery {
  const get = (key: string) => (raw instanceof URLSearchParams ? (raw.get(key) ?? '') : first(raw[key]));
  const stage = get('stage');
  const sort = get('sort');
  const dir = get('dir');
  const page = Number.parseInt(get('page'), 10);
  const pageSize = Number.parseInt(get('pageSize'), 10);
  return {
    q: get('q').trim().slice(0, 100),
    stage: (APPLICATION_STAGES as readonly string[]).includes(stage) ? (stage as ApplicationStage) : null,
    jobId: get('jobId') || null,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    // Any size the API accepts (1–100) works from the url; the picker offers 20/50/100.
    pageSize: Number.isFinite(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : DEFAULT_PAGE_SIZE,
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : null,
    dir: dir === 'asc' || dir === 'desc' ? dir : null,
  };
}

/** The direction a sort runs in when none is given (the repository's own default). */
export const defaultDir = (sort: SortKey | null): SortDir => (!sort || sort === 'createdAt' ? 'desc' : 'asc');

/** ListQuery → "q=…&stage=…" with defaults left out (so urls stay short). */
export function listSearch(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.stage) params.set('stage', query.stage);
  if (query.jobId) params.set('jobId', query.jobId);
  if (query.sort) params.set('sort', query.sort);
  if (query.dir) params.set('dir', query.dir);
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize));
  if (query.page > 1) params.set('page', String(query.page));
  return params.toString();
}

/**
 * A url for the list with some of its state changed. Changing anything other
 * than the page sends you back to page 1.
 */
export function listHref(query: ListQuery, patch: Partial<ListQuery>): string {
  const next: ListQuery = { ...query, ...patch };
  if (!('page' in patch)) next.page = 1;
  const search = listSearch(next);
  return search ? `/admin/applications?${search}` : '/admin/applications';
}

/** The export endpoint with the list's filters (the job filter included). */
export function exportHref(query: ListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.stage) params.set('stage', query.stage);
  if (query.jobId) params.set('jobId', query.jobId);
  if (query.sort) params.set('sort', query.sort);
  if (query.dir) params.set('dir', query.dir);
  const search = params.toString();
  return `/api/v1/admin/applications/export${search ? `?${search}` : ''}`;
}

/**
 * The list url to go back to from an applicant (?from=<list query>), with only
 * the list's own keys kept — never an arbitrary url.
 */
export function backHref(from: string | undefined): string {
  if (!from) return '/admin/applications';
  const search = listSearch(parseListQuery(new URLSearchParams(from)));
  return search ? `/admin/applications?${search}` : '/admin/applications';
}
