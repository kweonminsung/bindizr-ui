import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ACTIVITY_RESULT_LABELS,
  activityEntityLabel,
  activityOperationEntity,
  activityOperationLabel,
  activityTargetLabel,
} from "@/lib/activity";
import { getActivityLogPage } from "@/lib/api";
import { formatDateTime, toNextDayStart, toDayStart } from "@/lib/datetime";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
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
  ACTIVITY_LOG_SORT_FIELDS,
  ACTIVITY_RESULTS,
  ActivityLog,
  ActivityLogListQuery,
  ActivityLogSortField,
  ActivityResult,
  SortOrder,
} from "@/lib/types";
import ChangeSourceBadge, { describeActor } from "./ChangeSourceBadge";
import { FilterField, FilterSelect } from "./FilterFields";
import {
  ListCard,
  ListFooter,
  ListToolbar,
  PageSummary,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";
import Badge from "./Badge";
import SortControl from "./SortControl";

const DEFAULT_FILTERS = {
  entity: "",
  operation: "",
  result: "",
  name: "",
  zone_name: "",
  record_name: "",
  record_type: "",
  since: "",
  until: "",
};

const TEXT_FILTERS = [
  { name: "name", label: "Target or zone name" },
  { name: "zone_name", label: "Zone name" },
  { name: "record_name", label: "Record name" },
  { name: "record_type", label: "Record type" },
  { name: "since", label: "From (UTC)", type: "date" },
  { name: "until", label: "To (UTC)", type: "date" },
] as const;

const ANY_OPTION = { value: "", label: "Any" };

const RESULT_OPTIONS = [
  ANY_OPTION,
  ...ACTIVITY_RESULTS.map((result) => ({
    value: result,
    label: ACTIVITY_RESULT_LABELS[result],
  })),
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Created" },
  { value: "operation", label: "Operation" },
  { value: "target", label: "Target" },
] as const;

const RESULT_TONES = {
  changed: "success",
  succeeded: "success",
  failed: "warning",
} as const satisfies { [result in ActivityResult]: string };

const DEFAULT_SORT: ActivityLogSortField = "created_at";
const DEFAULT_ORDER: SortOrder = "desc";

export default function ActivityLogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listing, setListing] = useState<
    ({ rows: ActivityLog[]; total: number } | { error: string }) & {
      request: string;
    }
  >();
  const [operations, setOperations] = useState<string[]>();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const currentPage = getPageFromSearchParams(searchParams);
  const rowsPerPage = getPageSizeFromSearchParams(searchParams);
  const sort = getSortFromSearchParams(
    searchParams,
    ACTIVITY_LOG_SORT_FIELDS,
    DEFAULT_SORT,
  );
  const order = getOrderFromSearchParams(searchParams, DEFAULT_ORDER);
  const activeFilterCount = countActiveFilters(filters);
  const offset = (currentPage - 1) * rowsPerPage;
  const request = JSON.stringify({
    ...filters,
    since: toDayStart(filters.since),
    until: toNextDayStart(filters.until),
    sort,
    order,
    limit: rowsPerPage,
    offset,
  } satisfies ActivityLogListQuery);
  const current = listing?.request === request ? listing : undefined;
  const rows = current && "rows" in current ? current.rows : null;
  const total = listing && "total" in listing ? listing.total : 0;
  const error = current && "error" in current ? current.error : null;

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setSearchParams(updatePageSizeSearchParam(searchParams, pageSize));
  };

  const handleFilterChange = (
    key: keyof typeof DEFAULT_FILTERS,
    value: string,
  ) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    handlePageChange(1);
  };

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
    const controller = new AbortController();

    async function fetchRows() {
      try {
        const query: ActivityLogListQuery = JSON.parse(request);
        const result = await getActivityLogPage(query, controller.signal);
        if (!controller.signal.aborted) {
          setOperations(result.operations);
          setListing({
            request,
            rows: result.items,
            total: result.pagination.total,
          });
        }
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setListing({
            request,
            error:
              getErrorStatus(fetchError) === 404
                ? "The connected Bindizr API does not provide the Activity log. Check the server URL and version in Settings → General."
                : getErrorMessage(
                    fetchError,
                    "Failed to fetch the activity log",
                  ),
          });
        }
      }
    }

    fetchRows();
    return () => controller.abort();
  }, [request]);

  const entities = new Set(operations?.map(activityOperationEntity));
  const entityOptions = [
    ANY_OPTION,
    ...Array.from(entities, (entity) => ({
      value: entity,
      label: activityEntityLabel(entity),
    })),
  ];
  const operationOptions = [
    ANY_OPTION,
    ...(operations ?? []).map((operation) => ({
      value: operation,
      label: activityOperationLabel(operation),
    })),
  ];

  return (
    <ListCard>
      <ListToolbar
        filters={
          <>
            {operations ? (
              <>
                <FilterSelect
                  id="filter_activity_entity"
                  label="Operation group"
                  value={filters.entity}
                  onChange={(value) => handleFilterChange("entity", value)}
                  options={entityOptions}
                />
                <FilterSelect
                  id="filter_activity_operation"
                  label="Operation"
                  value={filters.operation}
                  onChange={(value) => handleFilterChange("operation", value)}
                  options={operationOptions}
                />
              </>
            ) : (
              <>
                <FilterField
                  id="filter_activity_entity"
                  label="Operation group"
                  value={filters.entity}
                  onChange={(value) => handleFilterChange("entity", value)}
                  placeholder="zone"
                />
                <FilterField
                  id="filter_activity_operation"
                  label="Operation"
                  value={filters.operation}
                  onChange={(value) => handleFilterChange("operation", value)}
                  placeholder="zone.create"
                />
              </>
            )}
            <FilterSelect
              id="filter_activity_result"
              label="Result"
              value={filters.result}
              onChange={(value) => handleFilterChange("result", value)}
              options={RESULT_OPTIONS}
            />
            {TEXT_FILTERS.map((field) => (
              <FilterField
                key={field.name}
                id={`filter_activity_${field.name}`}
                label={field.label}
                type={"type" in field ? field.type : undefined}
                value={filters[field.name]}
                onChange={(value) => handleFilterChange(field.name, value)}
              />
            ))}
          </>
        }
        activeFilterCount={activeFilterCount}
        onResetFilters={() => {
          setFilters(DEFAULT_FILTERS);
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
      />
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
        </Notice>
      )}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th
                scope="col"
                className={`hidden w-44 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                When
              </th>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Operation
              </th>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Target
              </th>
              <th
                scope="col"
                className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Actor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows?.map((row) => {
              const timestamp = (
                <time dateTime={row.created_at}>
                  {formatDateTime(row.created_at)}
                </time>
              );
              const actor = (
                <>
                  {row.actor ? describeActor(row.actor) : "—"}
                  <ChangeSourceBadge source={row.source} className="ml-2" />
                </>
              );
              return (
                <tr key={row.id}>
                  <td
                    className={`hidden ${TABLE_CELL_CLASS} align-top text-gray-500 @min-[37rem]/list:table-cell`}
                  >
                    {timestamp}
                  </td>
                  <td className={`${TABLE_CELL_CLASS} align-top`}>
                    <p className="font-medium text-gray-900 wrap-anywhere">
                      {activityOperationLabel(row.operation)}
                    </p>
                    <p className="my-1 text-xs text-gray-500 @min-[37rem]/list:hidden">
                      {timestamp}
                    </p>
                    <Badge tone={RESULT_TONES[row.result]}>
                      {ACTIVITY_RESULT_LABELS[row.result] ?? row.result}
                    </Badge>
                  </td>
                  <td className={`${TABLE_CELL_CLASS} align-top wrap-anywhere`}>
                    <p className="font-medium text-gray-900">
                      {activityTargetLabel(row.target) || "—"}
                    </p>
                    {row.detail && (
                      <p className="mt-1 text-gray-600">{row.detail}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 @min-[46rem]/list:hidden">
                      {actor}
                    </p>
                  </td>
                  <td
                    className={`hidden ${TABLE_CELL_CLASS} align-top text-gray-500 wrap-anywhere @min-[46rem]/list:table-cell`}
                  >
                    {actor}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ListFooter
        summary={
          rows === null ? (
            !error && "Loading the activity log..."
          ) : rows.length > 0 ? (
            <PageSummary offset={offset} count={rows.length} total={total} />
          ) : (
            "No activity found"
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
