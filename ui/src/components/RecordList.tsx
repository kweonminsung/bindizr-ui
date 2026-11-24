import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getRecordsPage,
  getRecordsWithDnssecPage,
  deleteRecord,
} from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { getErrorMessage } from "@/lib/errors";
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  getPageSizeFromSearchParams,
  getSortFromSearchParams,
  updatePageSizeSearchParam,
  updatePageSearchParam,
  updateSortSearchParams,
} from "@/lib/pageQuery";
import {
  DERIVED_RECORD_TYPES,
  RECORD_SORT_FIELDS,
  RECORD_TYPES,
  RecordListQuery,
  RecordSortField,
  RecordResponse,
  SortOrder,
  ZoneResponse,
} from "@/lib/types";
import { formatRecordValue } from "@/lib/recordValue";
import { countActiveFilters, toFilterNumber } from "@/lib/form";
import { FilterField } from "./FilterFields";
import Modal from "./Modal";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";
import RecordDetails from "./RecordDetails";
import SortControl from "./SortControl";
import { useToast } from "@/contexts/ToastContext";
import {
  ListCard,
  ListFooter,
  LIST_FIELD_CLASS,
  ListToolbar,
  PageSummary,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";

interface RecordListProps {
  zoneName?: string;
  zones?: ZoneResponse[];
}

interface RecordFilters {
  name: string;
  value: string;
  min_ttl: string;
  max_ttl: string;
  min_priority: string;
  max_priority: string;
}

const defaultFilters: RecordFilters = {
  name: "",
  value: "",
  min_ttl: "",
  max_ttl: "",
  min_priority: "",
  max_priority: "",
};

const RECORD_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "type", label: "Type" },
  { value: "ttl", label: "TTL" },
  { value: "priority", label: "Priority" },
  { value: "created_at", label: "Created" },
] as const;

const DEFAULT_RECORD_SORT: RecordSortField = "name";

const SIGNED_FILTER_TYPES: readonly string[] = [
  ...RECORD_TYPES,
  ...DERIVED_RECORD_TYPES,
];

export default function RecordList({ zoneName, zones = [] }: RecordListProps) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = getSortFromSearchParams(
    searchParams,
    RECORD_SORT_FIELDS,
    DEFAULT_RECORD_SORT,
  );
  const order = getOrderFromSearchParams(searchParams);
  const [listing, setListing] = useState<{
    request: string;
    records: RecordResponse[];
    total: number;
  } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<RecordResponse | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailEditing, setDetailEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentPage = getPageFromSearchParams(searchParams);
  const recordsPerPage = getPageSizeFromSearchParams(searchParams);
  const [searchQuery, setSearchQuery] = useState("");
  const includeDnssec =
    (searchParams.get("include_dnssec") ?? searchParams.get("signed")) ===
    "true";
  const typeParam = searchParams.get("type") ?? "";
  const mnemonic = typeParam.toUpperCase();
  const selectedType = SIGNED_FILTER_TYPES.includes(mnemonic)
    ? mnemonic
    : typeParam;
  const availableTypes: readonly string[] = includeDnssec
    ? SIGNED_FILTER_TYPES
    : RECORD_TYPES;
  const typeOptions =
    selectedType && !availableTypes.includes(selectedType)
      ? [selectedType, ...availableTypes]
      : availableTypes;
  const [filters, setFilters] = useState<RecordFilters>(defaultFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const activeFilterCount = countActiveFilters(filters) + Number(includeDnssec);
  const derivedTypeSelected = DERIVED_RECORD_TYPES.includes(
    selectedType as (typeof DERIVED_RECORD_TYPES)[number],
  );
  // These filters force the user plane, where there are no generated DNSSEC records.
  const userPlaneOnly =
    searchQuery.trim() !== "" ||
    filters.value.trim() !== "" ||
    filters.min_priority.trim() !== "" ||
    filters.max_priority.trim() !== "" ||
    (selectedType !== "" && !derivedTypeSelected);
  // The user-plane endpoint rejects a derived type outright; the URL keeps it.
  const requestedType =
    (!includeDnssec || userPlaneOnly) && derivedTypeSelected
      ? ""
      : selectedType;

  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify([
    includeDnssec && !userPlaneOnly,
    {
      zone_name: zoneName,
      search: searchQuery,
      type: requestedType,
      name: filters.name,
      value: filters.value,
      min_ttl: toFilterNumber(filters.min_ttl),
      max_ttl: toFilterNumber(filters.max_ttl),
      min_priority: toFilterNumber(filters.min_priority),
      max_priority: toFilterNumber(filters.max_priority),
      sort,
      order,
      limit: recordsPerPage,
      offset: (currentPage - 1) * recordsPerPage,
    } satisfies RecordListQuery,
  ]);
  const records = listing?.request === request ? listing.records : null;
  const totalRecords = listing?.total ?? 0;

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setSearchParams(updatePageSizeSearchParam(searchParams, pageSize));
  };

  const handleFilterChange = (key: keyof RecordFilters, value: string) => {
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
        DEFAULT_RECORD_SORT,
      ),
    );
  };

  // URL-backed filters: deep links stay shareable, the form follows the zone.
  const handleUrlFilterChange = (
    key: "zone_name" | "type" | "include_dnssec",
    value: string,
  ) => {
    const nextSearchParams = updatePageSearchParam(searchParams, 1);
    if (key === "zone_name") nextSearchParams.delete("zoneName");
    if (key === "include_dnssec") nextSearchParams.delete("signed");
    if (value) {
      nextSearchParams.set(key, value);
    } else {
      nextSearchParams.delete(key);
    }
    setSearchParams(nextSearchParams);
  };

  useEffect(() => {
    let active = true;

    async function fetchRecords() {
      setError(null);
      try {
        const [includeDnssec, query]: [boolean, RecordListQuery] =
          JSON.parse(request);
        const fetchPage = includeDnssec
          ? getRecordsWithDnssecPage
          : getRecordsPage;
        const data = await fetchPage(query);
        if (active) {
          setListing({
            request,
            records: data.items,
            total: data.pagination.total,
          });
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, "Failed to fetch records"));
        }
      }
    }

    fetchRecords();

    return () => {
      active = false;
    };
  }, [refreshKey, request]);

  const handleDelete = async (record: RecordResponse) => {
    if (record.id == null) {
      return;
    }
    if (window.confirm(`Delete ${record.name} ${record.type}?`)) {
      try {
        await deleteRecord(record.id);
        toast.success(`Deleted ${record.name} ${record.type}`);
        if (records?.length === 1 && currentPage > 1) {
          handlePageChange(currentPage - 1);
        } else {
          setRefreshKey((prev) => prev + 1);
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to delete record"));
      }
    }
  };

  const handleShowDetails = (record: RecordResponse, editing = false) => {
    setSelectedRecord(record);
    setDetailEditing(editing);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedRecord(null);
    setIsDetailModalOpen(false);
  };

  const indexOfFirstRecord = (currentPage - 1) * recordsPerPage;

  return (
    <ListCard>
      <ListToolbar
        scope={
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(6.75rem,0.65fr)] gap-2">
            <select
              value={zoneName ?? ""}
              onChange={(e) =>
                handleUrlFilterChange("zone_name", e.target.value)
              }
              aria-label="Filter by zone"
              className={LIST_FIELD_CLASS}
            >
              <option value="">All Zones</option>
              {/* Keep a deep-linked zone selectable while zones load. */}
              {zoneName && !zones.some((zone) => zone.name === zoneName) && (
                <option value={zoneName}>{zoneName}</option>
              )}
              {zones.map((zone) => (
                <option key={zone.id} value={zone.name}>
                  {zone.name}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => handleUrlFilterChange("type", e.target.value)}
              aria-label="Filter by record type"
              title={selectedType || undefined}
              className={`${LIST_FIELD_CLASS} truncate`}
            >
              <option value="">All Types</option>
              {typeOptions.map((type) => (
                <option
                  key={type}
                  value={type}
                  disabled={!availableTypes.includes(type)}
                >
                  {type}
                  {selectedType === type &&
                    requestedType !== type &&
                    " (inactive)"}
                </option>
              ))}
            </select>
          </div>
        }
        filters={
          <>
            <label
              title="Include the derived DNSSEC records (DNSKEY, RRSIG, the denial chain, CDS/CDNSKEY) in the listing — read-only rows"
              className="col-span-full flex min-h-8 cursor-pointer items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                className="shrink-0"
                checked={includeDnssec}
                onChange={(e) =>
                  handleUrlFilterChange(
                    "include_dnssec",
                    e.target.checked ? "true" : "",
                  )
                }
              />
              <span>Show generated DNSSEC records</span>
            </label>
            <FilterField
              id="filter_record_name"
              label="Name"
              value={filters.name}
              onChange={(value) => handleFilterChange("name", value)}
            />
            <FilterField
              id="filter_record_value"
              label="Value contains"
              value={filters.value}
              onChange={(value) => handleFilterChange("value", value)}
            />
            <FilterField
              id="filter_record_min_ttl"
              label="Min TTL"
              type="number"
              value={filters.min_ttl}
              onChange={(value) => handleFilterChange("min_ttl", value)}
            />
            <FilterField
              id="filter_record_max_ttl"
              label="Max TTL"
              type="number"
              value={filters.max_ttl}
              onChange={(value) => handleFilterChange("max_ttl", value)}
            />
            <FilterField
              id="filter_record_min_priority"
              label="Min Priority"
              type="number"
              value={filters.min_priority}
              onChange={(value) => handleFilterChange("min_priority", value)}
            />
            <FilterField
              id="filter_record_max_priority"
              label="Max Priority"
              type="number"
              value={filters.max_priority}
              onChange={(value) => handleFilterChange("max_priority", value)}
            />
          </>
        }
        activeFilterCount={activeFilterCount}
        onResetFilters={() => {
          setFilters(defaultFilters);
          handleUrlFilterChange("include_dnssec", "");
        }}
        sort={
          <SortControl
            options={RECORD_SORT_OPTIONS}
            sort={sort}
            order={order}
            onChange={handleSortChange}
          />
        }
      >
        <input
          type="text"
          aria-label="Search records"
          placeholder="Search records..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handlePageChange(1);
          }}
          className={LIST_FIELD_CLASS}
        />
      </ListToolbar>
      {derivedTypeSelected && !includeDnssec && (
        <Notice tone="info" className="mx-4 mb-4">
          Show generated DNSSEC records in Filters to apply the {selectedType}{" "}
          type filter.
        </Notice>
      )}
      {includeDnssec && userPlaneOnly && (
        <p className="mx-4 mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Generated DNSSEC records are hidden while searching or filtering by
          value, priority or a user record type.
          {derivedTypeSelected &&
            ` The ${selectedType} filter applies once they are cleared.`}
        </p>
      )}
      {/* Not an early return: a rejected filter must stay correctable. */}
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
          {records &&
            records.length > 0 &&
            " — showing the last results that loaded."}
        </Notice>
      )}
      <div className={`overflow-x-auto ${error ? "opacity-60" : ""}`}>
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                <span className="@min-[37rem]/list:hidden">Record</span>
                <span className="hidden @min-[37rem]/list:inline">Name</span>
              </th>
              <th
                scope="col"
                className={`hidden w-24 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Type
              </th>
              <th
                scope="col"
                className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Value
              </th>
              <th
                scope="col"
                className={`w-24 text-right @min-[37rem]/list:w-32 ${TABLE_HEADER_CLASS}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(records ?? []).map((record, index) => {
              const value = formatRecordValue(record.value, record.type);
              return (
                <tr
                  key={record.id ?? `derived-${index}`}
                  {...clickableRowProps(() => handleShowDetails(record))}
                >
                  <td
                    className={`${TABLE_CELL_CLASS} font-medium text-gray-900`}
                  >
                    <div className="truncate" title={record.name}>
                      {record.name}
                    </div>
                    <div
                      className={`mt-1 flex flex-wrap items-center gap-1 text-xs leading-5 text-gray-500 ${record.id != null ? "@min-[37rem]/list:hidden" : ""}`}
                    >
                      <span className="@min-[37rem]/list:hidden">
                        {record.type}
                      </span>
                      {record.id == null && (
                        <span className="rounded-full bg-gray-100 px-2 text-gray-600">
                          Derived
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 truncate font-normal text-gray-500 @min-[46rem]/list:hidden"
                      title={value}
                    >
                      {value}
                    </p>
                  </td>
                  <td
                    className={`hidden @min-[37rem]/list:table-cell whitespace-nowrap ${TABLE_CELL_CLASS} text-gray-500`}
                  >
                    {record.type}
                  </td>
                  <td
                    className={`hidden @min-[46rem]/list:table-cell overflow-hidden text-ellipsis whitespace-pre ${TABLE_CELL_CLASS} text-gray-500`}
                    title={value}
                  >
                    {value}
                  </td>
                  <td
                    className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-right`}
                  >
                    {record.id != null &&
                    (record.actions.includes("record:update") ||
                      record.actions.includes("record:delete")) ? (
                      <div className="flex flex-col items-end justify-end gap-1 @min-[37rem]/list:flex-row @min-[37rem]/list:gap-2">
                        {record.actions.includes("record:update") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowDetails(record, true);
                            }}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                        )}
                        {record.actions.includes("record:delete") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(record);
                            }}
                            className="font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">read-only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selectedRecord && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <RecordDetails
            record={selectedRecord}
            defaultEditing={detailEditing}
            onRecordChanged={(updatedRecord) => {
              setSelectedRecord(updatedRecord);
              setRefreshKey((prev) => prev + 1);
            }}
          />
        </Modal>
      )}
      <ListFooter
        summary={
          records === null ? (
            !error && "Loading records..."
          ) : records.length > 0 ? (
            <PageSummary
              offset={indexOfFirstRecord}
              count={records.length}
              total={totalRecords}
            />
          ) : (
            "No records found"
          )
        }
      >
        <PaginationControls
          currentPage={currentPage}
          pageSize={recordsPerPage}
          totalItems={totalRecords}
          disabled={records === null}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </ListFooter>
    </ListCard>
  );
}
