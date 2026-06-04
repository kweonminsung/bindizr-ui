import { pageSizeOptions } from "@/lib/pageQuery";

interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const visiblePageCount = 5;

export default function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
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
    <div className="flex flex-wrap items-center justify-center gap-2">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        Rows
        <select
          value={safePageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center justify-center">
        <button
          onClick={() => onPageChange(Math.max(1, selectedPage - 1))}
          disabled={selectedPage === 1}
          className="px-3 py-1 mx-1 my-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white"
        >
          Previous
        </button>
        {pages.map((page) => {
          const isCurrent = page === selectedPage;

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={isCurrent}
              aria-current={isCurrent ? "page" : undefined}
              className={`min-w-9 px-3 py-1 mx-1 my-1 rounded-md text-sm font-medium ${
                isCurrent
                  ? "bg-(--primary) text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(Math.min(totalPages, selectedPage + 1))}
          disabled={selectedPage >= totalPages}
          className="px-3 py-1 mx-1 my-1 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:hover:bg-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
