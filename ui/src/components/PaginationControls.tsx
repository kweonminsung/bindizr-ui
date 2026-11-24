import { pageSizeOptions } from "@/lib/pageQuery";

interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const visiblePageCount = 5;
const pageButton =
  "min-h-[2.125rem] whitespace-nowrap rounded-md px-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white";

export default function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const safePageSize = Math.max(1, pageSize);
  const knownPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const totalPages = disabled ? Math.max(currentPage, knownPages) : knownPages;
  const selectedPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageGroupStart =
    Math.floor((selectedPage - 1) / visiblePageCount) * visiblePageCount + 1;
  const pageGroupEnd = Math.min(
    pageGroupStart + visiblePageCount - 1,
    totalPages,
  );
  const pages = Array.from(
    { length: pageGroupEnd - pageGroupStart + 1 },
    (_, index) => pageGroupStart + index,
  );

  return (
    <nav aria-label="Pagination" className="@container/pages min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2 @min-[28rem]/pages:justify-end">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Rows
          <select
            value={safePageSize}
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-[2.125rem]"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, selectedPage - 1))}
            disabled={disabled || selectedPage === 1}
            aria-label="Previous page"
            className={pageButton}
          >
            <span aria-hidden="true" className="@min-[28rem]/pages:hidden">
              ‹
            </span>
            <span className="hidden @min-[28rem]/pages:inline">Previous</span>
          </button>
          <span
            aria-current="page"
            className="whitespace-nowrap px-1 text-sm tabular-nums text-gray-700 @min-[28rem]/pages:hidden"
          >
            Page {selectedPage}
          </span>
          {pages.map((page) => (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              disabled={disabled || page === selectedPage}
              aria-current={page === selectedPage ? "page" : undefined}
              className={`hidden min-h-[2.125rem] min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium @min-[28rem]/pages:inline-flex ${
                page === selectedPage
                  ? "bg-(--primary) text-white"
                  : "text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, selectedPage + 1))}
            disabled={disabled || selectedPage >= totalPages}
            aria-label="Next page"
            className={pageButton}
          >
            <span aria-hidden="true" className="@min-[28rem]/pages:hidden">
              ›
            </span>
            <span className="hidden @min-[28rem]/pages:inline">Next</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
