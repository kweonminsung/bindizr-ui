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
