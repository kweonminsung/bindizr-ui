import { ReactNode, useId, useState } from "react";
import ChevronDownIcon from "./icons/ChevronDownIcon";

const LIST_INSET = "px-3 @min-[50rem]/list:px-4 @min-[65rem]/list:px-6";

export const TABLE_HEADER_CLASS = `${LIST_INSET} py-3 text-xs font-medium text-gray-500 uppercase tracking-wider`;
export const TABLE_CELL_CLASS = `${LIST_INSET} py-2.5 @min-[50rem]/list:py-4`;
export const LIST_FIELD_CLASS = "min-w-0 w-full max-w-full min-h-[2.125rem]";

export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="@container/list min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
      {children}
    </div>
  );
}

interface ListToolbarProps {
  /** The main search or scope selector. */
  children?: ReactNode;
  /** Additional scope fields that stay together as the toolbar wraps. */
  scope?: ReactNode;
  filters?: ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  sort?: ReactNode;
  actions?: ReactNode;
}

export function ListToolbar({
  children,
  scope,
  filters,
  activeFilterCount = 0,
  onResetFilters,
  sort,
  actions,
}: ListToolbarProps) {
  const filtersId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterCount = activeFilterCount > 0 ? ` (${activeFilterCount})` : "";
  const filterToggle = filters && (
    <button
      type="button"
      onClick={() => setFiltersOpen((open) => !open)}
      aria-expanded={filtersOpen}
      aria-controls={filtersOpen ? filtersId : undefined}
      className="flex min-h-[2.125rem] shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-gray-300 px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
    >
      Filters{filterCount}
      <ChevronDownIcon
        className={`size-4 transition-transform duration-200 ${
          filtersOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
  const sortControl = sort && (
    <div className="min-w-0 flex-[1_1_min(100%,10rem)] @min-[29rem]/toolbar:max-w-52">
      {sort}
    </div>
  );

  return (
    <div className={`@container/toolbar ${LIST_INSET} py-3`}>
      <div className="flex flex-wrap items-center gap-2">
        {(children || (!scope && filters)) && (
          <div
            className={`flex min-w-0 items-center gap-2 ${
              children
                ? "flex-[1_1_min(100%,13rem)] @min-[29rem]/toolbar:max-w-80"
                : "shrink-0"
            }`}
          >
            {children && <div className="min-w-0 flex-1">{children}</div>}
            {!scope && filterToggle}
          </div>
        )}
        {scope && (
          <div className="min-w-0 flex-[1_1_min(100%,14rem)] @min-[29rem]/toolbar:max-w-72">
            {scope}
          </div>
        )}
        {scope && filterToggle && sort ? (
          <div className="flex min-w-0 flex-[1_1_min(100%,20rem)] items-center gap-2 @min-[29rem]/toolbar:max-w-[24rem]">
            {filterToggle}
            {sortControl}
          </div>
        ) : (
          <>
            {scope && filterToggle}
            {sortControl}
          </>
        )}
        {actions && (
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 empty:hidden @min-[23rem]/toolbar:gap-2">
            {actions}
          </div>
        )}
      </div>
      {filters && filtersOpen && (
        <div
          id={filtersId}
          className="mt-3 max-w-4xl rounded-md border border-gray-200 p-3"
        >
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={onResetFilters}
              disabled={activeFilterCount === 0}
              className="text-sm font-medium text-gray-600 hover:underline disabled:text-gray-300 disabled:no-underline"
            >
              Reset filters
            </button>
          </div>
          <div className="grid items-end gap-3 @min-[18rem]/toolbar:grid-cols-2 @min-[36rem]/toolbar:grid-cols-3">
            {filters}
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
    <div
      className={`@container/footer border-t border-gray-100 ${LIST_INSET} py-3`}
    >
      <div className="flex flex-col gap-3 @min-[29rem]/footer:flex-row @min-[29rem]/footer:items-center @min-[29rem]/footer:justify-between">
        {summary && (
          <p role="status" className="text-sm text-gray-700">
            {summary}
          </p>
        )}
        {children}
      </div>
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
