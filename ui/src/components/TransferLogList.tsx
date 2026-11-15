import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getTransferLogPage } from "@/lib/api";
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
  TRANSFER_RESULTS,
  TransferLog,
  TransferLogListQuery,
  TransferResult,
} from "@/lib/types";
import FilterPanel, { FilterField, FilterSelect } from "./FilterPanel";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";

interface TransferLogFilters {
  secondary_name: string;
  address: string;
  zone_name: string;
  result: string;
  since: string;
  until: string;
}

const defaultFilters: TransferLogFilters = {
  secondary_name: "",
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
  // A secondary links here with its name, which seeds the filter once.
  const [filters, setFilters] = useState<TransferLogFilters>(() => ({
    ...defaultFilters,
    secondary_name: searchParams.get("secondary_name") ?? "",
  }));
  const currentPage = getPageFromSearchParams(searchParams);
  const rowsPerPage = getPageSizeFromSearchParams(searchParams);
  const activeFilterCount = countActiveFilters(filters);
  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify({
    secondary_name: filters.secondary_name.trim() || undefined,
    address: filters.address,
    zone_name: filters.zone_name,
    result: toChoice<TransferResult>(TRANSFER_RESULTS, filters.result),
    since: toDayStart(filters.since),
    until: toDayEnd(filters.until),
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
    activeFilterCount === 0 &&
    currentPage === 1
  ) {
    return (
      <p className="text-center text-gray-500">Loading the transfer log...</p>
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
          <FilterField
            id="filter_transfer_secondary_name"
            label="Secondary"
            value={filters.secondary_name}
            onChange={(value) => handleFilterChange("secondary_name", value)}
            placeholder="The addresses it resolves to now"
          />
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
                Zone
              </th>
              <th
                scope="col"
                className="w-36 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Transfer
              </th>
              <th
                scope="col"
                className="hidden md:table-cell w-28 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Transport
              </th>
              <th
                scope="col"
                className="hidden md:table-cell w-32 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Serial
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
      <div className="flex flex-col sm:flex-row justify-between items-center p-4">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-gray-700">
            {rows === null ? (
              !error && "Loading the transfer log..."
            ) : rows.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium">{indexOfFirstRow + 1}</span> to{" "}
                <span className="font-medium">{indexOfLastRow}</span> of{" "}
                <span className="font-medium">{total}</span>
              </>
            ) : (
              "No transfers found"
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
