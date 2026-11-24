import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getZone, getZonesPage, deleteZone, getDnssecStatus } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { toNextDayStart, toDayStart } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
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
  SortOrder,
  ZoneResponse,
  ZONE_SORT_FIELDS,
  ZoneListQuery,
  ZoneSortField,
} from "@/lib/types";
import { countActiveFilters, toFilterNumber } from "@/lib/form";
import { FilterField, FilterSelect } from "./FilterFields";
import SortControl from "./SortControl";
import Modal from "./Modal";
import { PageHeader } from "./PageHeader";
import NotifyAllZones from "./NotifyAllZones";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";
import ZoneDetails from "./ZoneDetails";
import ZoneExport from "./ZoneExport";
import ZoneImportForm from "./ZoneImportForm";
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

interface ZoneListProps {
  onCreateZone: () => void;
  /** Opens the bulk import from a server. */
  onImportZones: () => void;
}

interface ZoneFilters {
  name: string;
  mname: string;
  rname: string;
  min_default_ttl: string;
  max_default_ttl: string;
  serial: string;
  min_serial: string;
  max_serial: string;
  /** "" any, "true" signed, "false" unsigned. */
  dnssec_enabled: string;
  since: string;
  until: string;
}

const defaultFilters: ZoneFilters = {
  name: "",
  mname: "",
  rname: "",
  min_default_ttl: "",
  max_default_ttl: "",
  serial: "",
  min_serial: "",
  max_serial: "",
  dnssec_enabled: "",
  since: "",
  until: "",
};

const DNSSEC_OPTIONS = [
  { value: "", label: "Any" },
  { value: "true", label: "Enabled" },
  { value: "false", label: "Disabled" },
] as const;

const ZONE_SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "serial", label: "Serial" },
  { value: "default_ttl", label: "Default TTL" },
  { value: "created_at", label: "Created" },
] as const;

const DEFAULT_ZONE_SORT: ZoneSortField = "name";

/** Badge probes per batch, so a large page is not one burst. */
const DNSSEC_PROBE_BATCH = 6;

export default function ZoneList({
  onCreateZone,
  onImportZones,
}: ZoneListProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const { allows, allowsWholeZone, allowsWholeZoneAnywhere } =
    useBindizrToken();
  const [searchParams, setSearchParams] = useSearchParams();
  const { focusName, focusTab, clearFocusName } = useFocusName();
  const [listing, setListing] = useState<{
    request: string;
    zones: ZoneResponse[];
    total: number;
  } | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [importingZone, setImportingZone] = useState<ZoneResponse | null>(null);
  const [exportingZone, setExportingZone] = useState<ZoneResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentPage = getPageFromSearchParams(searchParams);
  const zonesPerPage = getPageSizeFromSearchParams(searchParams);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ZoneFilters>(defaultFilters);
  const sort = getSortFromSearchParams(
    searchParams,
    ZONE_SORT_FIELDS,
    DEFAULT_ZONE_SORT,
  );
  const order = getOrderFromSearchParams(searchParams);
  const [refreshKey, setRefreshKey] = useState(0);
  // Names of the listed zones that are DNSSEC-signed, for the name badge.
  const [dnssecZones, setDnssecZones] = useState<Set<string>>(new Set());
  // Probe results by zone name, so paging and filtering re-use them.
  const dnssecProbes = useRef(new Map<string, boolean>());
  const activeFilterCount = countActiveFilters(filters);
  // Rows fetched for another request are never drawn under this one.
  const request = JSON.stringify({
    search: searchQuery,
    name: filters.name,
    mname: filters.mname,
    rname: filters.rname,
    min_default_ttl: toFilterNumber(filters.min_default_ttl),
    max_default_ttl: toFilterNumber(filters.max_default_ttl),
    serial: toFilterNumber(filters.serial),
    min_serial: toFilterNumber(filters.min_serial),
    max_serial: toFilterNumber(filters.max_serial),
    dnssec_enabled:
      filters.dnssec_enabled === ""
        ? undefined
        : filters.dnssec_enabled === "true",
    since: toDayStart(filters.since),
    until: toNextDayStart(filters.until),
    sort,
    order,
    limit: zonesPerPage,
    offset: (currentPage - 1) * zonesPerPage,
  } satisfies ZoneListQuery);
  const zones = listing?.request === request ? listing.zones : null;
  const totalZones = listing?.total ?? 0;

  const handleDnssecChanged = useCallback(
    (zoneName: string, enabled: boolean) => {
      dnssecProbes.current.set(zoneName, enabled);
      setDnssecZones((prev) => {
        if (prev.has(zoneName) === enabled) {
          return prev;
        }
        const next = new Set(prev);
        if (enabled) {
          next.add(zoneName);
        } else {
          next.delete(zoneName);
        }
        return next;
      });
    },
    [],
  );

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setSearchParams(updatePageSizeSearchParam(searchParams, pageSize));
  };

  const handleFilterChange = (key: keyof ZoneFilters, value: string) => {
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
        DEFAULT_ZONE_SORT,
      ),
    );
  };

  useEffect(() => {
    let active = true;

    async function fetchZones() {
      setError(null);
      try {
        const query: ZoneListQuery = JSON.parse(request);
        const data = await getZonesPage(query);
        if (active) {
          setListing({
            request,
            zones: data.items,
            total: data.pagination.total,
          });
          // Keep an open details modal in sync, e.g. the serial after a rollback.
          setSelectedZone((prev) =>
            prev
              ? (data.items.find((zone) => zone.name === prev.name) ?? prev)
              : prev,
          );
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, "Failed to fetch zones"));
        }
      }
    }

    fetchZones();

    return () => {
      active = false;
    };
  }, [refreshKey, request]);

  // An explicit refresh re-probes; paging and filtering reuse the cache.
  useEffect(() => {
    dnssecProbes.current.clear();
  }, [refreshKey]);

  // The list API has no DNSSEC flag, so probe the zones not seen yet.
  useEffect(() => {
    // The status endpoint needs `dnssec:read` in the zone.
    const names = (zones ?? [])
      .map((zone) => zone.name)
      .filter((name) => allows("dnssec:read", name));
    if (names.length === 0) {
      return;
    }

    let active = true;
    const probes = dnssecProbes.current;

    const showBadges = () => {
      if (active) {
        setDnssecZones(new Set(names.filter((name) => probes.get(name))));
      }
    };

    (async () => {
      const pending = names.filter((name) => !probes.has(name));
      showBadges();

      for (let i = 0; i < pending.length; i += DNSSEC_PROBE_BATCH) {
        if (!active) {
          return;
        }
        const batch = pending.slice(i, i + DNSSEC_PROBE_BATCH);
        const results = await Promise.allSettled(
          batch.map(async (name) => ({
            name,
            enabled: (await getDnssecStatus(name)).enabled,
          })),
        );
        for (const result of results) {
          if (result.status === "fulfilled") {
            probes.set(result.value.name, result.value.enabled);
          }
        }
        showBadges();
      }
    })();

    return () => {
      active = false;
    };
  }, [zones, allows]);

  const handleDelete = async (zone: ZoneResponse) => {
    // A zone delete cannot be undone, so the counts go in the prompt rather
    // than in a toast once everything is already gone.
    let preview;
    try {
      preview = await deleteZone(zone.name, true);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to check what deleting the zone removes",
        ),
      );
      return;
    }

    const goesWithIt = `${preview.records_deleted} record${preview.records_deleted === 1 ? "" : "s"} and ${preview.versions_deleted} saved version${preview.versions_deleted === 1 ? "" : "s"}`;
    if (
      !window.confirm(
        `Delete "${zone.name}"?\n\n${goesWithIt} go with it. This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const removed = await deleteZone(zone.name);
      toast.success(
        `Deleted ${zone.name}: ${removed.records_deleted} records, ${removed.versions_deleted} versions`,
      );
      if (zones?.length === 1 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete zone"));
    }
  };

  const handleShowDetails = (zone: ZoneResponse) => {
    setSelectedZone(zone);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedZone(null);
    setIsDetailModalOpen(false);
    clearFocusName();
  };

  // A link names a zone to open, which may sit on another page of the list.
  useEffect(() => {
    if (!focusName) {
      return;
    }
    let active = true;
    getZone(focusName)
      .then((zone) => {
        if (active) {
          handleShowDetails(zone);
        }
      })
      .catch((error) => {
        if (active) {
          toast.error(getErrorMessage(error, "Failed to fetch zone"));
        }
      });
    return () => {
      active = false;
    };
  }, [focusName]);

  const handleCloseImport = () => {
    setImportingZone(null);
  };

  const indexOfFirstZone = (currentPage - 1) * zonesPerPage;

  return (
    <>
      <PageHeader
        title="Zones"
        description="Open a zone to manage its records, settings, versions and DNSSEC."
        actions={
          <>
            {allows("zone:update") && (
              <NotifyAllZones
                onSerialBumpFinished={() => setRefreshKey((key) => key + 1)}
              />
            )}
            {allowsWholeZoneAnywhere("record:create") && (
              <button
                type="button"
                onClick={onImportZones}
                className="btn-secondary"
              >
                Import Zones
              </button>
            )}
            {allows("zone:create") && (
              <button
                type="button"
                onClick={onCreateZone}
                className="btn-primary"
              >
                Create Zone
              </button>
            )}
          </>
        }
      />
      <ListCard>
        <ListToolbar
          filters={
            <>
              <FilterField
                id="filter_zone_name"
                label="Name"
                value={filters.name}
                onChange={(value) => handleFilterChange("name", value)}
              />
              <FilterField
                id="filter_zone_mname"
                label="Primary NS"
                value={filters.mname}
                onChange={(value) => handleFilterChange("mname", value)}
              />
              <FilterField
                id="filter_zone_rname"
                label="Admin Email"
                value={filters.rname}
                onChange={(value) => handleFilterChange("rname", value)}
              />
              <FilterField
                id="filter_zone_min_default_ttl"
                label="Min Default TTL"
                type="number"
                value={filters.min_default_ttl}
                onChange={(value) =>
                  handleFilterChange("min_default_ttl", value)
                }
              />
              <FilterField
                id="filter_zone_max_default_ttl"
                label="Max Default TTL"
                type="number"
                value={filters.max_default_ttl}
                onChange={(value) =>
                  handleFilterChange("max_default_ttl", value)
                }
              />
              <FilterField
                id="filter_zone_serial"
                label="Serial"
                type="number"
                value={filters.serial}
                onChange={(value) => handleFilterChange("serial", value)}
              />
              <FilterField
                id="filter_zone_min_serial"
                label="Min Serial"
                type="number"
                value={filters.min_serial}
                onChange={(value) => handleFilterChange("min_serial", value)}
              />
              <FilterField
                id="filter_zone_max_serial"
                label="Max Serial"
                type="number"
                value={filters.max_serial}
                onChange={(value) => handleFilterChange("max_serial", value)}
              />
              <FilterSelect
                id="filter_zone_dnssec_enabled"
                label="DNSSEC"
                value={filters.dnssec_enabled}
                onChange={(value) =>
                  handleFilterChange("dnssec_enabled", value)
                }
                options={DNSSEC_OPTIONS}
              />
              <FilterField
                id="filter_zone_since"
                label="Created from (UTC)"
                type="date"
                value={filters.since}
                onChange={(value) => handleFilterChange("since", value)}
              />
              <FilterField
                id="filter_zone_until"
                label="Created to (UTC)"
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
              options={ZONE_SORT_OPTIONS}
              sort={sort}
              order={order}
              onChange={handleSortChange}
            />
          }
        >
          <input
            type="text"
            aria-label="Search zones"
            placeholder="Search zones..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handlePageChange(1);
            }}
            className={LIST_FIELD_CLASS}
          />
        </ListToolbar>
        {/* Not an early return: a rejected filter must stay correctable. */}
        {error && (
          <Notice tone="error" className="mx-4 mb-4">
            {error}
            {zones &&
              zones.length > 0 &&
              " — showing the last results that loaded."}
          </Notice>
        )}
        <div className={`overflow-x-auto ${error ? "opacity-60" : ""}`}>
          {/* Fixed layout: column widths must not follow the page content. */}
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th scope="col" className={TABLE_HEADER_CLASS}>
                  Zone Name
                </th>
                <th
                  scope="col"
                  className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                >
                  Primary NS
                </th>
                <th
                  scope="col"
                  className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                >
                  Admin Email
                </th>
                <th
                  scope="col"
                  className={`w-24 text-right @min-[37rem]/list:w-64 ${TABLE_HEADER_CLASS}`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(zones ?? []).map((zone) => (
                <tr
                  key={zone.id}
                  {...clickableRowProps(() => handleShowDetails(zone))}
                >
                  <td
                    className={`${TABLE_CELL_CLASS} font-medium text-gray-900`}
                  >
                    <div className="truncate" title={zone.name}>
                      {zone.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 empty:hidden">
                      {dnssecZones.has(zone.name) && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          DNSSEC
                        </span>
                      )}
                      {!zone.enabled && (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                          title="Bindizr removes this zone from its catalog. Its records stay editable."
                        >
                          Disabled
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={`hidden @min-[46rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                  >
                    {zone.mname}
                  </td>
                  <td
                    className={`hidden @min-[46rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                  >
                    {zone.rname}
                  </td>
                  <td
                    className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-right`}
                  >
                    <div className="flex flex-col items-end justify-end gap-1 @min-[37rem]/list:flex-row @min-[37rem]/list:gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(
                            `/records?zone_name=${encodeURIComponent(zone.name)}`,
                          );
                        }}
                        className="font-medium text-green-600 hover:underline"
                      >
                        Records
                      </button>
                      {/* Import applies a whole zone file, so its grant must be unrestricted. */}
                      {allowsWholeZone("record:create", zone.name) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setImportingZone(zone);
                          }}
                          className="font-medium text-purple-600 hover:underline"
                        >
                          Import
                        </button>
                      )}
                      {allowsWholeZone("record:read", zone.name) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExportingZone(zone);
                          }}
                          className="font-medium text-teal-600 hover:underline"
                        >
                          Export
                        </button>
                      )}
                      {allows("zone:delete", zone.name) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(zone);
                          }}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selectedZone && (
          <Modal
            isOpen={isDetailModalOpen}
            wide
            structured
            onClose={handleCloseDetails}
            label="Zone details"
          >
            <ZoneDetails
              zone={selectedZone}
              initialTab={focusTab}
              onZoneChanged={(updatedZone) => {
                setSelectedZone((current) =>
                  current?.id === updatedZone.id ? updatedZone : current,
                );
                setRefreshKey((prev) => prev + 1);
              }}
              onSerialChanged={(serial) => {
                // A late response can arrive after another zone edit advances the serial.
                setSelectedZone((current) =>
                  current?.id === selectedZone.id &&
                  current.serial === selectedZone.serial
                    ? { ...current, serial }
                    : current,
                );
                setRefreshKey((prev) => prev + 1);
              }}
              onDnssecChanged={handleDnssecChanged}
            />
          </Modal>
        )}
        {importingZone && (
          <Modal isOpen onClose={handleCloseImport}>
            <ZoneImportForm
              zone={importingZone}
              onApplied={() => setRefreshKey((prev) => prev + 1)}
            />
          </Modal>
        )}
        {exportingZone && (
          <Modal isOpen wide onClose={() => setExportingZone(null)}>
            <ZoneExport zone={exportingZone} />
          </Modal>
        )}
        <ListFooter
          summary={
            zones === null ? (
              !error && "Loading zones..."
            ) : zones.length > 0 ? (
              <PageSummary
                offset={indexOfFirstZone}
                count={zones.length}
                total={totalZones}
              />
            ) : (
              "No zones found"
            )
          }
        >
          <PaginationControls
            currentPage={currentPage}
            pageSize={zonesPerPage}
            totalItems={totalZones}
            disabled={zones === null}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </ListFooter>
      </ListCard>
    </>
  );
}
