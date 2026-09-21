export const pageSizeOptions = [10, 20, 50];
const defaultPageSize = pageSizeOptions[0];

export function getPageFromSearchParams(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPageSizeFromSearchParams(searchParams: URLSearchParams) {
  const pageSize = Number(searchParams.get("limit"));
  return pageSizeOptions.includes(pageSize) ? pageSize : defaultPageSize;
}

export function updatePageSearchParam(
  searchParams: URLSearchParams,
  page: number,
) {
  const nextSearchParams = new URLSearchParams(searchParams);

  if (page <= 1) {
    nextSearchParams.delete("page");
  } else {
    nextSearchParams.set("page", String(page));
  }

  return nextSearchParams;
}

export function updatePageSizeSearchParam(
  searchParams: URLSearchParams,
  pageSize: number,
) {
  const nextSearchParams = new URLSearchParams(searchParams);

  nextSearchParams.delete("page");

  if (pageSize === defaultPageSize) {
    nextSearchParams.delete("limit");
  } else {
    nextSearchParams.set("limit", String(pageSize));
  }

  return nextSearchParams;
}

/** The sort field the URL names, or the fallback when it names none. */
export function getSortFromSearchParams<T extends string>(
  searchParams: URLSearchParams,
  allowed: readonly T[],
  fallback: T,
): T {
  const sort = searchParams.get("sort");
  return allowed.includes(sort as T) ? (sort as T) : fallback;
}

/** The sort direction the URL names; ascending unless it says otherwise. */
export function getOrderFromSearchParams(
  searchParams: URLSearchParams,
): "asc" | "desc" {
  return searchParams.get("order") === "desc" ? "desc" : "asc";
}

/** URL params for a new sort, back on page one. */
export function updateSortSearchParams(
  searchParams: URLSearchParams,
  sort: string,
  order: "asc" | "desc",
  defaultSort: string,
) {
  const nextSearchParams = new URLSearchParams(searchParams);

  nextSearchParams.delete("page");

  if (sort === defaultSort) {
    nextSearchParams.delete("sort");
  } else {
    nextSearchParams.set("sort", sort);
  }

  if (order === "asc") {
    nextSearchParams.delete("order");
  } else {
    nextSearchParams.set("order", order);
  }

  return nextSearchParams;
}
