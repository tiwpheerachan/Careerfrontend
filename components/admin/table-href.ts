/** A table's paging, as the url holds it. `names` lets two tables on one page page apart. */
export interface TablePaging {
  path: string;
  /** The page's other state (a search, filters, another table's paging), kept on every link. */
  params: Record<string, string>;
  defaultSize: number;
  /** The url's names for the page and the page size; "page" and "pageSize" unless said. */
  names?: { page: string; size: string };
}

/** The url for a page and a page size — page 1 and the default size left out, so urls stay short. */
export function tableHref({ path, params, defaultSize, names }: TablePaging, page: number, pageSize: number): string {
  const search = new URLSearchParams(params);
  if (pageSize !== defaultSize) search.set(names?.size ?? 'pageSize', String(pageSize));
  if (page > 1) search.set(names?.page ?? 'page', String(page));
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
