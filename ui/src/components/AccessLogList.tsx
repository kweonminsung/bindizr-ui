import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAccessLogPage } from "@/lib/api";
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
  ACCESS_RESULTS,
  ACCESS_SOURCES,
  AccessLogResponse,
  AccessLogListQuery,
  AccessResult,
  AccessSource,
  ACCESS_LOG_SORT_FIELDS,
  AccessLogSortField,
  SortOrder,
} from "@/lib/types";
import ChangeSourceBadge, {
  CHANGE_SOURCE_LABELS,
  describeActor,
} from "./ChangeSourceBadge";
import { FilterField, FilterSelect } from "./FilterFields";
import Notice from "./Notice";
import Badge from "./Badge";
import PaginationControls from "./PaginationControls";
import SortControl from "./SortControl";
import {
  ListFooter,
  ListToolbar,
  PageSummary,
  TABLE_HEADER_CLASS,
} from "./ListLayout";

interface AccessLogFilters {
  source: string;
  result: string;
  actor_name: string;
  client_ip: string;
  since: string;
  until: string;
}

const defaultFilters: AccessLogFilters = {
  source: "",
  result: "",
  actor_name: "",
  client_ip: "",
  since: "",
  until: "",
};

const SOURCE_OPTIONS = [
  { value: "", label: "Any" },
  ...ACCESS_SOURCES.map((source) => ({
    value: source,
    label: CHANGE_SOURCE_LABELS[source],
  })),
] as const;

const RESULT_LABELS: Record<AccessResult, string> = {
  ok: "OK",
  denied: "Denied",
  failed: "Failed",
};

const RESULT_OPTIONS = [
  { value: "", label: "Any" },
  ...ACCESS_RESULTS.map((result) => ({
    value: result,
    label: RESULT_LABELS[result],
  })),
] as const;

const RESULT_TONES = {
  ok: "success",
  denied: "danger",
  failed: "warning",
} as const satisfies Record<AccessResult, string>;

const SORT_OPTIONS = [
  { value: "requested_at", label: "Request time" },
  { value: "source", label: "Source" },
  { value: "target", label: "Request" },
  { value: "response_code", label: "Response code" },
  { value: "result", label: "Result" },
  { value: "client_ip", label: "Client IP" },
] as const;

const DEFAULT_SORT: AccessLogSortField = "requested_at";

/** Newest first is the log's natural order, whatever the field. */
const DEFAULT_ORDER: SortOrder = "desc";

/** A select's value as the query takes it: one of `values`, or none. */
const toChoice = <T extends string>(
  values: readonly T[],
  value: string,
): T | undefined => (values.includes(value as T) ? (value as T) : undefined);

export default function AccessLogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listing, setListing] = useState<{
    request: string;
    rows: AccessLogResponse[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AccessLogFilters>(defaultFilters);
  const currentPage = getPageFromSearchParams(searchParams);
  const rowsPerPage = getPageSizeFromSearchParams(searchParams);
  const sort = getSortFromSearchParams(
    searchParams,
    ACCESS_LOG_SORT_FIELDS,
    DEFAULT_SORT,
  );
  const order = getOrderFromSearchParams(searchParams, DEFAULT_ORDER);
  const activeFilterCount = countActiveFilters(filters);
  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify({
    source: toChoice<AccessSource>(ACCESS_SOURCES, filters.source),
    result: toChoice<AccessResult>(ACCESS_RESULTS, filters.result),
    actor_name: filters.actor_name,
    client_ip: filters.client_ip,
    since: toDayStart(filters.since),
    until: toNextDayStart(filters.until),
    sort,
    order,
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  } satisfies AccessLogListQuery);
  const current = listing?.request === request ? listing : null;
  const rows = current?.rows ?? null;
  const total = current?.total ?? 0;

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

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <ListToolbar
        filters={
          <>
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
              id="filter_access_actor_name"
              label="Actor name"
              value={filters.actor_name}
              onChange={(value) => handleFilterChange("actor_name", value)}
              placeholder="A token or TSIG key name"
            />
            <FilterField
              id="filter_access_client_ip"
              label="Client IP"
              value={filters.client_ip}
              onChange={(value) => handleFilterChange("client_ip", value)}
              placeholder="192.0.2.10"
            />
            <FilterField
              id="filter_access_since"
              label="From (UTC)"
              type="date"
              value={filters.since}
              onChange={(value) => handleFilterChange("since", value)}
            />
            <FilterField
              id="filter_access_until"
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
        actions={
          <SortControl
            options={SORT_OPTIONS}
            sort={sort}
            order={order}
            onChange={handleSortChange}
          />
        }
      />
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
                Request
              </th>
              <th scope="col" className={`w-36 ${TABLE_HEADER_CLASS}`}>
                Result
              </th>
              <th
                scope="col"
                className={`hidden sm:table-cell w-32 ${TABLE_HEADER_CLASS}`}
              >
                Response code
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Actor
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell w-40 ${TABLE_HEADER_CLASS}`}
              >
                Client IP
              </th>
              <th
                scope="col"
                className={`hidden lg:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Error code
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
                  <Badge tone={RESULT_TONES[row.result]}>
                    {RESULT_LABELS[row.result] ?? row.result}
                  </Badge>
                  <span className="ml-2 text-gray-500 sm:hidden">
                    {row.response_code}
                  </span>
                </td>
                <td className="hidden sm:table-cell px-6 py-4 text-gray-500">
                  {row.response_code}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  <span className="break-all">
                    {row.actor ? describeActor(row.actor) : "—"}
                  </span>
                  <ChangeSourceBadge source={row.source} className="ml-2" />
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {row.client_ip}
                </td>
                <td
                  className="hidden lg:table-cell truncate px-6 py-4 text-gray-500"
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
            !error && "Loading the access log..."
          ) : rows.length > 0 ? (
            <PageSummary
              offset={indexOfFirstRow}
              count={rows.length}
              total={total}
            />
          ) : (
            "No requests found"
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
