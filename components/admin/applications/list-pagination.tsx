import { TablePagination } from '@/components/admin/table-pagination';
import { DEFAULT_PAGE_SIZE, listSearch, PAGE_SIZES, type ListQuery } from './list-query';

/** The applicants list's paging: the shared TablePagination, with the list's search, filters and sort kept. */
export function ListPagination({ query, total }: { query: ListQuery; total: number }) {
  // The list's state without its page and size — those are the pagination's to set.
  const params = Object.fromEntries(
    new URLSearchParams(listSearch({ ...query, page: 1, pageSize: DEFAULT_PAGE_SIZE })),
  );
  return (
    <TablePagination
      path="/admin/applications"
      params={params}
      page={query.page}
      pageSize={query.pageSize}
      total={total}
      sizes={PAGE_SIZES}
    />
  );
}
