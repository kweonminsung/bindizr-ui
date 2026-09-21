import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getZonesPage, deleteZone, getDnssecStatus } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { toDayEnd, toDayStart } from "@/lib/datetime";
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
import { SortOrder, Zone, ZONE_SORT_FIELDS, ZoneSortField } from "@/lib/types";
import { countActiveFilters, toFilterNumber } from "@/lib/form";
import FilterPanel, { FilterField, FilterSelect } from "./FilterPanel";
import SortControl from "./SortControl";
import Modal from "./Modal";
import NotifyAllZones from "./NotifyAllZones";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";
import ZoneDetails from "./ZoneDetails";
import ZoneExport from "./ZoneExport";
import ZoneImportForm from "./ZoneImportForm";
import { useToast } from "@/contexts/ToastContext";

interface ZoneListProps {
  onCreateZone: () => void;
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
  signed: string;
  created_after: string;
  created_before: string;
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
  signed: "",
  created_after: "",
  created_before: "",
};

const SIGNED_OPTIONS = [
  { value: "", label: "Any" },
  { value: "true", label: "Signed" },
  { value: "false", label: "Unsigned" },
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

export default function ZoneList({ onCreateZone }: ZoneListProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const { globalAccess } = useBindizrToken();
  const [searchParams, setSearchParams] = useSearchParams();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [importingZone, setImportingZone] = useState<Zone | null>(null);
  const [exportingZone, setExportingZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [totalZones, setTotalZones] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  // Names of the listed zones that are DNSSEC-signed, for the name badge.
  const [dnssecZones, setDnssecZones] = useState<Set<string>>(new Set());
  // Probe results by zone name, so paging and filtering re-use them.
  const dnssecProbes = useRef(new Map<string, boolean>());
  const activeFilterCount = countActiveFilters(filters);

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
      setLoading(true);
      setError(null);
      try {
        const data = await getZonesPage({
          search: searchQuery,
          name: filters.name,
          mname: filters.mname,
          rname: filters.rname,
          min_default_ttl: toFilterNumber(filters.min_default_ttl),
          max_default_ttl: toFilterNumber(filters.max_default_ttl),
          serial: toFilterNumber(filters.serial),
          min_serial: toFilterNumber(filters.min_serial),
          max_serial: toFilterNumber(filters.max_serial),
          signed: filters.signed === "" ? undefined : filters.signed === "true",
          created_after: toDayStart(filters.created_after),
          created_before: toDayEnd(filters.created_before),
          sort,
          order,
          limit: zonesPerPage,
          offset: (currentPage - 1) * zonesPerPage,
        });
        if (active) {
          setZones(data.items);
          setTotalZones(data.pagination.total);
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
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchZones();

    return () => {
      active = false;
    };
  }, [
    currentPage,
    filters,
    order,
    refreshKey,
    searchQuery,
    sort,
    zonesPerPage,
  ]);

  // An explicit refresh re-probes; paging and filtering reuse the cache.
  useEffect(() => {
    dnssecProbes.current.clear();
  }, [refreshKey]);

  // The list API has no DNSSEC flag, so probe the zones not seen yet.
  useEffect(() => {
    // The status endpoint needs a global token.
    if (!globalAccess || zones.length === 0) {
      return;
    }

    let active = true;
    const probes = dnssecProbes.current;
    const names = zones.map((zone) => zone.name);

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
  }, [zones, globalAccess]);

  const handleDelete = async (zone: Zone) => {
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

    const goesWithIt = `${preview.records} record${preview.records === 1 ? "" : "s"} and ${preview.versions} saved version${preview.versions === 1 ? "" : "s"}`;
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
        `Deleted ${zone.name}: ${removed.records} records, ${removed.versions} versions`,
      );
      if (zones.length === 1 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete zone"));
    }
  };

  const handleShowDetails = (zone: Zone) => {
    setSelectedZone(zone);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedZone(null);
    setIsDetailModalOpen(false);
  };

  const handleCloseImport = () => {
    setImportingZone(null);
  };

  if (
    loading &&
    zones.length === 0 &&
    searchQuery === "" &&
    activeFilterCount === 0 &&
    currentPage === 1
  ) {
    return <p className="text-center text-gray-500">Loading zones...</p>;
  }

  const indexOfFirstZone = (currentPage - 1) * zonesPerPage;
  const indexOfLastZone = indexOfFirstZone + zones.length;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search zones..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handlePageChange(1);
          }}
          className="w-full sm:w-auto"
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 sm:mt-0">
          <SortControl
            options={ZONE_SORT_OPTIONS}
            sort={sort}
            order={order}
            onChange={handleSortChange}
          />
          {globalAccess && (
            <div className="flex flex-col sm:flex-row gap-2">
              <NotifyAllZones />
              <button
                onClick={onCreateZone}
                className="btn-primary w-full sm:w-auto"
              >
                Create Zone
              </button>
            </div>
          )}
        </div>
      </div>
      <FilterPanel
        activeCount={activeFilterCount}
        onReset={() => {
          setFilters(defaultFilters);
          handlePageChange(1);
        }}
      >
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
          onChange={(value) => handleFilterChange("min_default_ttl", value)}
        />
        <FilterField
          id="filter_zone_max_default_ttl"
          label="Max Default TTL"
          type="number"
          value={filters.max_default_ttl}
          onChange={(value) => handleFilterChange("max_default_ttl", value)}
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
          id="filter_zone_signed"
          label="DNSSEC"
          value={filters.signed}
          onChange={(value) => handleFilterChange("signed", value)}
          options={SIGNED_OPTIONS}
        />
        <FilterField
          id="filter_zone_created_after"
          label="Created After"
          type="date"
          value={filters.created_after}
          onChange={(value) => handleFilterChange("created_after", value)}
        />
        <FilterField
          id="filter_zone_created_before"
          label="Created Before"
          type="date"
          value={filters.created_before}
          onChange={(value) => handleFilterChange("created_before", value)}
        />
      </FilterPanel>
      {/* Not an early return: a rejected filter must stay correctable. */}
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
          {zones.length > 0 && " — showing the last results that loaded."}
        </Notice>
      )}
      <div className={`overflow-x-auto ${error ? "opacity-60" : ""}`}>
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Zone Name
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Primary NS
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Admin Email
              </th>
              <th
                scope="col"
                className="sm:w-72 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {zones.map((zone) => (
              <tr
                key={zone.id}
                {...clickableRowProps(() => handleShowDetails(zone))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {zone.name}
                  {dnssecZones.has(zone.name) && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      DNSSEC
                    </span>
                  )}
                  {!zone.enabled && (
                    <span
                      className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                      title="The secondaries have dropped this zone. Its records stay here, editable."
                    >
                      Disabled
                    </span>
                  )}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {zone.mname}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {zone.rname}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/records?zoneName=${encodeURIComponent(zone.name)}`,
                        );
                      }}
                      className="font-medium text-green-600 hover:underline"
                    >
                      Records
                    </button>
                    {globalAccess && (
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportingZone(zone);
                      }}
                      className="font-medium text-teal-600 hover:underline"
                    >
                      Export
                    </button>
                    {globalAccess && (
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
        <Modal isOpen={isDetailModalOpen} wide onClose={handleCloseDetails}>
          <ZoneDetails
            zone={selectedZone}
            onZoneChanged={(updatedZone) => {
              // A rename or a new serial makes the name-based sync above miss.
              setSelectedZone(updatedZone);
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
      <div className="flex flex-col sm:flex-row justify-between items-center p-4">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-gray-700">
            {zones.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium">{indexOfFirstZone + 1}</span> to{" "}
                <span className="font-medium">{indexOfLastZone}</span> of{" "}
                <span className="font-medium">{totalZones}</span>
              </>
            ) : (
              "No zones found"
            )}
          </p>
        </div>
        <PaginationControls
          currentPage={currentPage}
          pageSize={zonesPerPage}
          totalItems={totalZones}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
