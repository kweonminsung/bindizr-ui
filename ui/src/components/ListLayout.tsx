import { ReactNode, useState } from "react";
import ChevronDownIcon from "./icons/ChevronDownIcon";

/** The header cell every listing table uses. */
export const TABLE_HEADER_CLASS =
  "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider";

interface ListToolbarProps {
  /** Search and the selectors that set the listing's scope. */
  children?: ReactNode;
  /** The listing's further filter fields, behind a toggle beside the search. */
  filters?: ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  /** Sort, then the listing's actions. */
  actions?: ReactNode;
}

/** The row above a listing: what it searches and filters at the start, how
 * it sorts and what it can do at the end, all on one line; the filter fields
 * open beneath it. */
export function ListToolbar({
  children,
  filters,
  activeFilterCount = 0,
  onResetFilters,
  actions,
}: ListToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {children}
          {filters && (
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-gray-600 hover:text-(--primary)"
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-200 ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {actions}
        </div>
      </div>
      {filters && filtersOpen && (
        <div className="mt-3 rounded-md border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{filters}</div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={onResetFilters}
              disabled={activeFilterCount === 0}
              className="text-sm font-medium text-gray-600 hover:underline disabled:text-gray-300 disabled:no-underline"
            >
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ListFooterProps {
  summary: ReactNode;
  /** The page controls of a listing the server pages. */
  children?: ReactNode;
}

/** The row below a listing: what it shows, then its page controls. */
export function ListFooter({ summary, children }: ListFooterProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4">
      <p className="text-sm text-gray-700">{summary}</p>
      {children}
    </div>
  );
}

interface PageSummaryProps {
  /** The zero-based position of the page's first row. */
  offset: number;
  count: number;
  total: number;
}

/** Which rows of how many a page shows. */
export function PageSummary({ offset, count, total }: PageSummaryProps) {
  return (
    <>
      Showing <span className="font-medium">{offset + 1}</span> to{" "}
      <span className="font-medium">{offset + count}</span> of{" "}
      <span className="font-medium">{total}</span>
    </>
  );
}

/** How many rows a listing fetched whole shows, or that it shows none. */
export function describeCount(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 0
    ? `No ${plural} found`
    : `${count} ${count === 1 ? singular : plural}`;
}
