import { describeTransferType, TRANSFER_RESULT_LABELS } from "@/lib/transfer";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getTransferLogPage } from "@/lib/api";
import { formatDateTime, toNextDayStart, toDayStart } from "@/lib/datetime";
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
  TransferLogResponse,
  TransferLogListQuery,
  TransferResult,
  TRANSFER_LOG_SORT_FIELDS,
  TransferLogSortField,
  SortOrder,
} from "@/lib/types";
import { FilterField, FilterSelect } from "./FilterFields";
import Notice from "./Notice";
import Badge from "./Badge";
import PaginationControls from "./PaginationControls";
import SortControl from "./SortControl";
import {
  ListCard,
  ListFooter,
  LIST_FIELD_CLASS,
  ListToolbar,
  PageSummary,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";

interface TransferLogFilters {
  client_ip: string;
  zone_name: string;
  result: string;
  since: string;
  until: string;
}

const defaultFilters: TransferLogFilters = {
  client_ip: "",
  zone_name: "",
  result: "",
  since: "",
  until: "",
};

const RESULT_OPTIONS = [
  { value: "", label: "Any" },
  ...TRANSFER_RESULTS.map((result) => ({
    value: result,
    label: TRANSFER_RESULT_LABELS[result],
  })),
] as const;

const RESULT_TONES = {
  ok: "success",
  refused: "danger",
  failed: "warning",
} as const satisfies Record<TransferResult, string>;

const SORT_OPTIONS = [
  { value: "created_at", label: "Created" },
  { value: "zone_name", label: "Zone" },
  { value: "kind", label: "Transfer type" },
  { value: "result", label: "Result" },
  { value: "client_ip", label: "Client IP" },
] as const;

const DEFAULT_SORT: TransferLogSortField = "created_at";

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
    rows: TransferLogResponse[];
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
    client_ip: filters.client_ip,
    zone_name: filters.zone_name,
    result: toChoice<TransferResult>(TRANSFER_RESULTS, filters.result),
    since: toDayStart(filters.since),
    until: toNextDayStart(filters.until),
    sort,
    order,
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  } satisfies TransferLogListQuery);
  const current = listing?.request === request ? listing : null;
  const rows = current?.rows ?? null;
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

  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;

  return (
    <ListCard>
      <ListToolbar
        filters={
          <>
            <FilterField
              id="filter_transfer_client_ip"
              label="Client IP"
              value={filters.client_ip}
              onChange={(value) => handleFilterChange("client_ip", value)}
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
              label="From (UTC)"
              type="date"
              value={filters.since}
              onChange={(value) => handleFilterChange("since", value)}
            />
            <FilterField
              id="filter_transfer_until"
              label="To (UTC)"
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
        sort={
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
          className={LIST_FIELD_CLASS}
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
              <th
                scope="col"
                className={`hidden w-40 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                When
              </th>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Zone
              </th>
              <th
                scope="col"
                className={`hidden w-28 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Transfer type
              </th>
              <th
                scope="col"
                className={`w-28 @min-[37rem]/list:w-32 ${TABLE_HEADER_CLASS}`}
              >
                Result
              </th>
              <th
                scope="col"
                className={`hidden w-24 @min-[54rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Transport
              </th>
              <th
                scope="col"
                className={`hidden w-28 @min-[54rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Serial
              </th>
              <th
                scope="col"
                className={`hidden w-36 @min-[54rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Client IP
              </th>
              <th
                scope="col"
                className={`hidden w-36 @min-[65rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Error code
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(rows ?? []).map((row, index) => (
              // A log row has no id and one address and zone repeat; the
              // page is replaced whole on every fetch, so its position is stable.
              <tr key={index} className="align-top">
                <td
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  <time dateTime={row.created_at}>
                    {formatDateTime(row.created_at)}
                  </time>
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <p
                    className="line-clamp-2 font-medium text-gray-900 wrap-anywhere @min-[54rem]/list:line-clamp-none"
                    title={row.zone_name}
                  >
                    {row.zone_name}
                  </p>
                  <div className="mt-1 space-y-1 text-xs text-gray-500 @min-[37rem]/list:hidden">
                    <time dateTime={row.created_at}>
                      {formatDateTime(row.created_at)}
                    </time>
                    <p>{describeTransferType(row)}</p>
                  </div>
                  <details
                    className={`mt-1 text-xs text-gray-600 ${row.error_code ? "@min-[65rem]/list:hidden" : "@min-[54rem]/list:hidden"}`}
                  >
                    <summary className="cursor-pointer">Details</summary>
                    <div className="mt-1 space-y-1 wrap-anywhere">
                      <p title={row.zone_name}>{row.zone_name}</p>
                      <div className="space-y-1 @min-[54rem]/list:hidden">
                        <p>Transport: {row.transport.toUpperCase()}</p>
                        <p>Serial: {row.serial ?? "—"}</p>
                        <p>Client IP: {row.client_ip}</p>
                      </div>
                      {row.error_code && <p>Error: {row.error_code}</p>}
                    </div>
                  </details>
                </td>
                <td
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS}`}
                >
                  {describeTransferType(row)}
                </td>
                <td className={TABLE_CELL_CLASS}>
                  <Badge tone={RESULT_TONES[row.result]}>
                    {TRANSFER_RESULT_LABELS[row.result] ?? row.result}
                  </Badge>
                </td>
                <td
                  className={`hidden @min-[54rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {row.transport.toUpperCase()}
                </td>
                <td
                  className={`hidden @min-[54rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {row.serial ?? "—"}
                </td>
                <td
                  className={`hidden @min-[54rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-500 wrap-anywhere`}
                >
                  {row.client_ip}
                </td>
                <td
                  className={`hidden @min-[65rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-500 wrap-anywhere`}
                  title={row.error_code ?? undefined}
                >
                  {row.error_code ?? "—"}
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
          disabled={rows === null}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </ListFooter>
    </ListCard>
  );
}
