import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getTransferLogPage } from "@/lib/api";
import { formatDateTime, toDayEnd, toDayStart } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { countActiveFilters } from "@/lib/form";
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  getPageSizeFromSearchParams,
  getSortFromSearchParams,
  updatePageSearchParam,
  updatePageSizeSearchParam,
  updateSortSearchParams,
} from "@/lib/pageQuery";
import {
  TRANSFER_RESULTS,
  TransferLog,
  TransferLogListQuery,
  TransferResult,
  TRANSFER_LOG_SORT_FIELDS,
  TransferLogSortField,
  SortOrder,
} from "@/lib/types";
import { FilterField, FilterSelect } from "./FilterFields";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";
import SortControl from "./SortControl";
import {
  ListFooter,
  ListToolbar,
  PageSummary,
  TABLE_HEADER_CLASS,
} from "./ListLayout";

interface TransferLogFilters {
  address: string;
  zone_name: string;
  result: string;
  since: string;
  until: string;
}

const defaultFilters: TransferLogFilters = {
  address: "",
  zone_name: "",
  result: "",
  since: "",
  until: "",
};

const RESULT_OPTIONS = [
  { value: "", label: "Any" },
  ...TRANSFER_RESULTS.map((result) => ({ value: result, label: result })),
] as const;

const RESULT_STYLES: Record<TransferResult, string> = {
  ok: "bg-green-100 text-green-700",
  refused: "bg-red-100 text-red-700",
  failed: "bg-amber-100 text-amber-700",
};

/** What a transfer was: the kind and whether a delta, or that it was refused or failed. */
function describeTransfer(transfer: TransferLog): string {
  if (transfer.result !== "ok") return transfer.result;
  if (transfer.kind === "ixfr")
    return transfer.incremental ? "IXFR delta" : "IXFR full";
  return "AXFR";
}

const SORT_OPTIONS = [
  { value: "at", label: "Time" },
  { value: "zone_name", label: "Zone" },
  { value: "kind", label: "Kind" },
  { value: "result", label: "Result" },
  { value: "address", label: "Address" },
] as const;

const DEFAULT_SORT: TransferLogSortField = "at";

/** Newest first is the log's natural order, whatever the field. */
const DEFAULT_ORDER: SortOrder = "desc";

/** A select's value as the query takes it: one of `values`, or none. */
const toChoice = <T extends string>(
  values: readonly T[],
  value: string,
): T | undefined => (values.includes(value as T) ? (value as T) : undefined);

export default function TransferLogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listing, setListing] = useState<{
    request: string;
    rows: TransferLog[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransferLogFilters>(defaultFilters);
  // URL-backed like the page: a secondary links here with its name, and the
  // sidebar's plain link clears it.
  const secondaryName = searchParams.get("secondary_name") ?? "";
  const currentPage = getPageFromSearchParams(searchParams);
  const rowsPerPage = getPageSizeFromSearchParams(searchParams);
  const sort = getSortFromSearchParams(
    searchParams,
    TRANSFER_LOG_SORT_FIELDS,
    DEFAULT_SORT,
  );
  const order = getOrderFromSearchParams(searchParams, DEFAULT_ORDER);
  const activeFilterCount = countActiveFilters(filters);
  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify({
    secondary_name: secondaryName.trim() || undefined,
    address: filters.address,
    zone_name: filters.zone_name,
    result: toChoice<TransferResult>(TRANSFER_RESULTS, filters.result),
    since: toDayStart(filters.since),
    until: toDayEnd(filters.until),
    sort,
    order,
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  } satisfies TransferLogListQuery);
  const rows = listing?.request === request ? listing.rows : null;
  const total = listing?.total ?? 0;

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setSearchParams(updatePageSizeSearchParam(searchParams, pageSize));
  };

  const handleFilterChange = (key: keyof TransferLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    handlePageChange(1);
  };

  const handleSecondaryChange = (value: string) => {
    const nextSearchParams = updatePageSearchParam(searchParams, 1);
    if (value) {
      nextSearchParams.set("secondary_name", value);
    } else {
      nextSearchParams.delete("secondary_name");
    }
    // Typing rewrites the entry rather than adding one per keystroke.
    setSearchParams(nextSearchParams, { replace: true });
  };

  // URL-backed like the page: a sorted listing stays shareable.
  const handleSortChange = (nextSort: string, nextOrder: SortOrder) => {
    setSearchParams(
      updateSortSearchParams(
        searchParams,
        nextSort,
        nextOrder,
        DEFAULT_SORT,
        DEFAULT_ORDER,
      ),
    );
  };

  useEffect(() => {
    let active = true;

    async function fetchRows() {
      setError(null);
      try {
        const query: TransferLogListQuery = JSON.parse(request);
        const data = await getTransferLogPage(query);
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
            getErrorMessage(fetchError, "Failed to fetch the transfer log"),
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
    secondaryName === "" &&
    activeFilterCount === 0 &&
    currentPage === 1
  ) {
    return (
      <p className="text-center text-gray-500">Loading the transfer log...</p>
    );
  }

  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <ListToolbar
        filters={
          <>
            <FilterField
              id="filter_transfer_address"
              label="Address"
              value={filters.address}
              onChange={(value) => handleFilterChange("address", value)}
              placeholder="192.0.2.10"
            />
            <FilterField
              id="filter_transfer_zone_name"
              label="Zone"
              value={filters.zone_name}
              onChange={(value) => handleFilterChange("zone_name", value)}
              placeholder="example.com"
            />
            <FilterSelect
              id="filter_transfer_result"
              label="Result"
              value={filters.result}
              onChange={(value) => handleFilterChange("result", value)}
              options={RESULT_OPTIONS}
            />
            <FilterField
              id="filter_transfer_since"
              label="From"
              type="date"
              value={filters.since}
              onChange={(value) => handleFilterChange("since", value)}
            />
            <FilterField
              id="filter_transfer_until"
              label="To"
              type="date"
              value={filters.until}
              onChange={(value) => handleFilterChange("until", value)}
            />
          </>
        }
        activeFilterCount={activeFilterCount}
        onResetFilters={() => {
          setFilters(defaultFilters);
          handlePageChange(1);
        }}
        actions={
          <SortControl
            options={SORT_OPTIONS}
            sort={sort}
            order={order}
            onChange={handleSortChange}
          />
        }
      >
        <input
          type="text"
          placeholder="Secondary"
          title="The addresses this secondary resolves to now"
          aria-label="Filter by secondary"
          value={secondaryName}
          onChange={(e) => handleSecondaryChange(e.target.value)}
          className="w-full sm:w-auto"
        />
      </ListToolbar>
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
              <th scope="col" className={`w-44 ${TABLE_HEADER_CLASS}`}>
                When
              </th>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Zone
              </th>
              <th scope="col" className={`w-36 ${TABLE_HEADER_CLASS}`}>
                Transfer
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell w-28 ${TABLE_HEADER_CLASS}`}
              >
                Transport
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell w-32 ${TABLE_HEADER_CLASS}`}
              >
                Serial
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell w-40 ${TABLE_HEADER_CLASS}`}
              >
                Address
              </th>
              <th
                scope="col"
                className={`hidden lg:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(rows ?? []).map((row, index) => (
              // A log row has no id and one address and zone repeat; the
              // page is replaced whole on every fetch, so its position is stable.
              <tr key={index}>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {formatDateTime(row.at)}
                </td>
                <td
                  className="truncate px-6 py-4 font-medium text-gray-900"
                  title={row.zone_name}
                >
                  {row.zone_name}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      RESULT_STYLES[row.result] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {describeTransfer(row)}
                  </span>
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                  {row.transport.toUpperCase()}
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                  {row.serial ?? "—"}
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
      <ListFooter
        summary={
          rows === null ? (
            !error && "Loading the transfer log..."
          ) : rows.length > 0 ? (
            <PageSummary
              offset={indexOfFirstRow}
              count={rows.length}
              total={total}
            />
          ) : (
            "No transfers found"
          )
        }
      >
        <PaginationControls
          currentPage={currentPage}
          pageSize={rowsPerPage}
          totalItems={total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </ListFooter>
    </div>
  );
}
