import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAuditLogPage } from "@/lib/api";
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
  AUDIT_ENTITIES,
  AuditEntity,
  AuditLog,
  AuditLogListQuery,
  AuditOperation,
} from "@/lib/types";
import ChangeSourceBadge, { describeActor } from "./ChangeSourceBadge";
import FilterPanel, { FilterField, FilterSelect } from "./FilterPanel";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";

interface AuditLogFilters {
  entity: string;
  entity_name: string;
  since: string;
  until: string;
}

const defaultFilters: AuditLogFilters = {
  entity: "",
  entity_name: "",
  since: "",
  until: "",
};

const ENTITY_LABELS: Record<AuditEntity, string> = {
  token: "API token",
  role: "Role",
  role_grant: "Role grant",
  tsig_key: "TSIG key",
  secondary: "Secondary",
  dnssec_policy: "DNSSEC policy",
  zone: "Zone",
};

const ENTITY_OPTIONS = [
  { value: "", label: "Any" },
  ...AUDIT_ENTITIES.map((entity) => ({
    value: entity,
    label: ENTITY_LABELS[entity],
  })),
] as const;

const OPERATION_STYLES: Record<AuditOperation, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};

/** The entity select's value as the query takes it: one of the kinds, or none. */
const toEntity = (value: string): AuditEntity | undefined =>
  AUDIT_ENTITIES.includes(value as AuditEntity)
    ? (value as AuditEntity)
    : undefined;

export default function AuditLogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listing, setListing] = useState<{
    request: string;
    rows: AuditLog[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditLogFilters>(defaultFilters);
  const currentPage = getPageFromSearchParams(searchParams);
  const rowsPerPage = getPageSizeFromSearchParams(searchParams);
  const activeFilterCount = countActiveFilters(filters);
  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify({
    entity: toEntity(filters.entity),
    entity_name: filters.entity_name,
    since: toDayStart(filters.since),
    until: toDayEnd(filters.until),
    limit: rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  } satisfies AuditLogListQuery);
  const rows = listing?.request === request ? listing.rows : null;
  const total = listing?.total ?? 0;

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setSearchParams(updatePageSizeSearchParam(searchParams, pageSize));
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    handlePageChange(1);
  };

  useEffect(() => {
    let active = true;

    async function fetchRows() {
      setError(null);
      try {
        const query: AuditLogListQuery = JSON.parse(request);
        const data = await getAuditLogPage(query);
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
            getErrorMessage(fetchError, "Failed to fetch the audit log"),
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
      <p className="text-center text-gray-500">Loading the audit log...</p>
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
            id="filter_audit_entity"
            label="Entity"
            value={filters.entity}
            onChange={(value) => handleFilterChange("entity", value)}
            options={ENTITY_OPTIONS}
          />
          <FilterField
            id="filter_audit_entity_name"
            label="Name"
            value={filters.entity_name}
            onChange={(value) => handleFilterChange("entity_name", value)}
            placeholder="A grant's is its role's"
          />
          <FilterField
            id="filter_audit_since"
            label="From"
            type="date"
            value={filters.since}
            onChange={(value) => handleFilterChange("since", value)}
          />
          <FilterField
            id="filter_audit_until"
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
                className="w-44 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Entity
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="w-28 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Change
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(rows ?? []).map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="truncate px-6 py-4 text-gray-500">
                  {ENTITY_LABELS[row.entity] ?? row.entity}
                </td>
                <td
                  className="truncate px-6 py-4 font-medium text-gray-900"
                  title={row.entity_name}
                >
                  {row.entity_name}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      OPERATION_STYLES[row.operation] ??
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {row.operation}
                  </span>
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  <span className="break-all">
                    {row.changed_by ? describeActor(row.changed_by) : "—"}
                  </span>
                  <ChangeSourceBadge
                    source={row.change_source}
                    className="ml-2"
                  />
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
              !error && "Loading the audit log..."
            ) : rows.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium">{indexOfFirstRow + 1}</span> to{" "}
                <span className="font-medium">{indexOfLastRow}</span> of{" "}
                <span className="font-medium">{total}</span>
              </>
            ) : (
              "No changes found"
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
