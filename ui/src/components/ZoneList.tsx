import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getZonesPage, deleteZone, getDnssecStatus } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  getPageFromSearchParams,
  getPageSizeFromSearchParams,
  updatePageSizeSearchParam,
  updatePageSearchParam,
} from "@/lib/pageQuery";
import { Zone } from "@/lib/types";
import { toFilterNumber } from "@/lib/form";
import FilterPanel, { FilterField } from "./FilterPanel";
import Modal from "./Modal";
import PaginationControls from "./PaginationControls";
import ZoneDetails from "./ZoneDetails";
import ZoneExport from "./ZoneExport";
import ZoneImportForm from "./ZoneImportForm";

interface ZoneListProps {
  onCreateZone: () => void;
}

interface ZoneFilters {
  name: string;
  mname: string;
  rname: string;
  min_ttl: string;
  max_ttl: string;
  serial: string;
}

const defaultFilters: ZoneFilters = {
  name: "",
  mname: "",
  rname: "",
  min_ttl: "",
  max_ttl: "",
  serial: "",
};

const countActiveFilters = (filters: ZoneFilters) =>
  Object.values(filters).filter((value) => value.trim() !== "").length;

export default function ZoneList({ onCreateZone }: ZoneListProps) {
  const navigate = useNavigate();
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
  const [totalZones, setTotalZones] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  // Names of the listed zones that are DNSSEC-signed, for the name badge.
  const [dnssecZones, setDnssecZones] = useState<Set<string>>(new Set());
  const activeFilterCount = countActiveFilters(filters);

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
          min_ttl: toFilterNumber(filters.min_ttl),
          max_ttl: toFilterNumber(filters.max_ttl),
          serial: toFilterNumber(filters.serial),
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
  }, [currentPage, filters, refreshKey, searchQuery, zonesPerPage]);

  // The list API has no DNSSEC flag, so probe each listed zone; the previous
  // badges stay up while the probes run to avoid flicker.
  useEffect(() => {
    if (zones.length === 0) {
      return;
    }

    let active = true;

    (async () => {
      const results = await Promise.allSettled(
        zones.map(async (zone) => ({
          name: zone.name,
          enabled: (await getDnssecStatus(zone.name)).enabled,
        })),
      );
      if (active) {
        const enabled = new Set<string>();
        for (const result of results) {
          if (result.status === "fulfilled" && result.value.enabled) {
            enabled.add(result.value.name);
          }
        }
        setDnssecZones(enabled);
      }
    })();

    return () => {
      active = false;
    };
  }, [zones]);

  const handleDelete = async (zone: Zone) => {
    if (window.confirm("Are you sure you want to delete this zone?")) {
      try {
        await deleteZone(zone.name);
        if (zones.length === 1 && currentPage > 1) {
          handlePageChange(currentPage - 1);
        } else {
          setRefreshKey((prev) => prev + 1);
        }
      } catch (error) {
        alert(getErrorMessage(error, "Failed to delete zone"));
      }
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
          className="w-full sm:w-auto mb-4 sm:mb-0"
        />
        <button onClick={onCreateZone} className="btn-primary w-full sm:w-auto">
          Create Zone
        </button>
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
          id="filter_zone_min_ttl"
          label="Min TTL"
          type="number"
          value={filters.min_ttl}
          onChange={(value) => handleFilterChange("min_ttl", value)}
        />
        <FilterField
          id="filter_zone_max_ttl"
          label="Max TTL"
          type="number"
          value={filters.max_ttl}
          onChange={(value) => handleFilterChange("max_ttl", value)}
        />
        <FilterField
          id="filter_zone_serial"
          label="Serial"
          type="number"
          value={filters.serial}
          onChange={(value) => handleFilterChange("serial", value)}
        />
      </FilterPanel>
      {/* Not an early return: a rejected filter must stay correctable. */}
      {error && (
        <p className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          {zones.length > 0 && " — showing the last results that loaded."}
        </p>
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
                onClick={() => handleShowDetails(zone)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {zone.name}
                  {dnssecZones.has(zone.name) && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      DNSSEC
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImportingZone(zone);
                      }}
                      className="font-medium text-purple-600 hover:underline"
                    >
                      Import
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportingZone(zone);
                      }}
                      className="font-medium text-teal-600 hover:underline"
                    >
                      Export
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(zone);
                      }}
                      className="font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
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
            onDnssecChanged={(zoneName, enabled) =>
              setDnssecZones((prev) => {
                // Bail out unless membership changes, or the identity-based
                // effect in the DNSSEC tab re-renders this list forever.
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
              })
            }
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
