import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAccessLogPage } from "@/lib/api";
import { formatDateTime, toDayEnd, toDayStart } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { countActiveFilters } from "@/lib/form";
import {
  getPageFromSearchParams,
  getPageSizeFromSearchParams,
  updatePageSearchParam,
  updatePageSizeSearchParam,
} from "@/lib/pageQuery";
import {
  ACCESS_RESULTS,
  ACCESS_SOURCES,
  AccessLog,
  AccessLogListQuery,
  AccessResult,
  AccessSource,
} from "@/lib/types";
import { describeActor } from "./ChangeSourceBadge";
import FilterPanel, { FilterField, FilterSelect } from "./FilterPanel";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";

interface AccessLogFilters {
  source: string;
  result: string;
  caller_name: string;
  address: string;
  since: string;
  until: string;
}

const defaultFilters: AccessLogFilters = {
  source: "",
  result: "",
  caller_name: "",
  address: "",
  since: "",
  until: "",
};

const SOURCE_LABELS: Record<AccessSource, string> = {
  api: "HTTP API",
  nsupdate: "nsupdate",
};

const SOURCE_OPTIONS = [
  { value: "", label: "Any" },
  ...ACCESS_SOURCES.map((source) => ({
    value: source,
    label: SOURCE_LABELS[source],
  })),
] as const;

const RESULT_OPTIONS = [
  { value: "", label: "Any" },
  ...ACCESS_RESULTS.map((result) => ({ value: result, label: result })),
] as const;

const RESULT_STYLES: Record<AccessResult, string> = {
  ok: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  failed: "bg-amber-100 text-amber-700",
};

/** A select's value as the query takes it: one of `values`, or none. */
const toChoice = <T extends string>(
  values: readonly T[],
  value: string,
): T | undefined => (values.includes(value as T) ? (value as T) : undefined);

export default function AccessLogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listing, setListing] = useState<{
    request: string;
    rows: AccessLog[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AccessLogFilters>(defaultFilters);
  const currentPage = getPageFromSearchParams(searchParams);
  const rowsPerPage = getPageSizeFromSearchParams(searchParams);
  const activeFilterCount = countActiveFilters(filters);
  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify({
    source: toChoice<AccessSource>(ACCESS_SOURCES, filters.source),
    result: toChoice<AccessResult>(ACCESS_RESULTS, filters.result),
    caller_name: filters.caller_name,
    address: filters.address,
    since: toDayStart(filters.since),
    until: toDayEnd(filters.until),
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  } satisfies AccessLogListQuery);
  const rows = listing?.request === request ? listing.rows : null;
  const total = listing?.total ?? 0;

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setSearchParams(updatePageSizeSearchParam(searchParams, pageSize));
  };

  const handleFilterChange = (key: keyof AccessLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    handlePageChange(1);
  };

  useEffect(() => {
    let active = true;

    async function fetchRows() {
      setError(null);
      try {
        const query: AccessLogListQuery = JSON.parse(request);
        const data = await getAccessLogPage(query);
        if (active) {
          setListing({
            request,
            rows: data.items,
            total: data.pagination.total,
          });
        }
      } catch (fetchError) {
        if (active) {
          setError(
            getErrorMessage(fetchError, "Failed to fetch the access log"),
          );
        }
      }
    }

    fetchRows();

    return () => {
      active = false;
    };
  }, [request]);

  if (
    listing === null &&
    !error &&
    activeFilterCount === 0 &&
    currentPage === 1
  ) {
    return (
      <p className="text-center text-gray-500">Loading the access log...</p>
    );
  }

  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + (rows?.length ?? 0);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="pt-4">
        <FilterPanel
          activeCount={activeFilterCount}
          onReset={() => {
            setFilters(defaultFilters);
            handlePageChange(1);
          }}
        >
          <FilterSelect
            id="filter_access_source"
            label="Source"
            value={filters.source}
            onChange={(value) => handleFilterChange("source", value)}
            options={SOURCE_OPTIONS}
          />
          <FilterSelect
            id="filter_access_result"
            label="Result"
            value={filters.result}
            onChange={(value) => handleFilterChange("result", value)}
            options={RESULT_OPTIONS}
          />
          <FilterField
            id="filter_access_caller_name"
            label="Caller"
            value={filters.caller_name}
            onChange={(value) => handleFilterChange("caller_name", value)}
            placeholder="A token or TSIG key name"
          />
          <FilterField
            id="filter_access_address"
            label="Address"
            value={filters.address}
            onChange={(value) => handleFilterChange("address", value)}
            placeholder="192.0.2.10"
          />
          <FilterField
            id="filter_access_since"
            label="From"
            type="date"
            value={filters.since}
            onChange={(value) => handleFilterChange("since", value)}
          />
          <FilterField
            id="filter_access_until"
            label="To"
            type="date"
            value={filters.until}
            onChange={(value) => handleFilterChange("until", value)}
          />
        </FilterPanel>
      </div>
      {/* Not an early return: a rejected filter must stay correctable. */}
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
          {rows &&
            rows.length > 0 &&
            " — showing the last results that loaded."}
        </Notice>
      )}
      <div className={`overflow-x-auto ${error ? "opacity-60" : ""}`}>
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th
                scope="col"
                className="w-44 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                When
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Request
              </th>
              <th
                scope="col"
                className="w-36 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Result
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Caller
              </th>
              <th
                scope="col"
                className="hidden md:table-cell w-40 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Address
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(rows ?? []).map((row, index) => (
              // A log row has no id; the page is replaced whole on every
              // fetch, so its position is stable.
              <tr key={index}>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {formatDateTime(row.requested_at)}
                </td>
                <td
                  className="truncate px-6 py-4 font-medium text-gray-900"
                  title={`${row.method} ${row.target}`}
                >
                  {row.method} {row.target}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      RESULT_STYLES[row.result] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {row.result}
                  </span>
                  <span className="ml-2 text-gray-500">{row.status}</span>
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  <span className="break-all">
                    {row.caller ? describeActor(row.caller) : "—"}
                  </span>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {SOURCE_LABELS[row.source] ?? row.source}
                  </span>
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {row.address}
                </td>
                <td
                  className="hidden lg:table-cell truncate px-6 py-4 text-gray-500"
                  title={row.error ?? undefined}
                >
                  {row.error ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center p-4">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-gray-700">
            {rows === null ? (
              !error && "Loading the access log..."
            ) : rows.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium">{indexOfFirstRow + 1}</span> to{" "}
                <span className="font-medium">{indexOfLastRow}</span> of{" "}
                <span className="font-medium">{total}</span>
              </>
            ) : (
              "No requests found"
            )}
          </p>
        </div>
        <PaginationControls
          currentPage={currentPage}
          pageSize={rowsPerPage}
          totalItems={total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
