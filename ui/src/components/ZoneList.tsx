import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getZonesPage, deleteZone, notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";
import Modal from "./Modal";
import PaginationControls from "./PaginationControls";
import ZoneDetails from "./ZoneDetails";

interface ZoneListProps {
  onEditZone: (zone: Zone) => void;
  onCreateZone: () => void;
}

export default function ZoneList({ onEditZone, onCreateZone }: ZoneListProps) {
  const navigate = useNavigate();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const zonesPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifyingZoneName, setNotifyingZoneName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    async function fetchZones() {
      setLoading(true);
      setError(null);
      try {
        const data = await getZonesPage({
          search: searchQuery,
          limit: zonesPerPage,
          offset: (currentPage - 1) * zonesPerPage,
        });
        if (active) {
          setZones(data.items);
          setHasNextPage(data.hasNext);
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
  }, [currentPage, refreshKey, searchQuery]);

  const handleDelete = async (zone: Zone) => {
    if (window.confirm("Are you sure you want to delete this zone?")) {
      try {
        await deleteZone(zone.name);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        alert(getErrorMessage(error, "Failed to delete zone"));
      }
    }
  };

  const handleShowDetails = (zone: Zone) => {
    setSelectedZone(zone);
    setIsDetailModalOpen(true);
  };

  const handleNotify = async (zone: Zone) => {
    setNotifyingZoneName(zone.name);
    try {
      const message = await notifyZones(zone.name);
      alert(message);
    } catch (error) {
      alert(getErrorMessage(error, "Failed to send DNS NOTIFY"));
    } finally {
      setNotifyingZoneName(null);
    }
  };

  const handleCloseDetails = () => {
    setSelectedZone(null);
    setIsDetailModalOpen(false);
  };

  if (
    loading &&
    zones.length === 0 &&
    searchQuery === "" &&
    currentPage === 1
  ) {
    return <p className="text-center text-gray-500">Loading zones...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
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
            setCurrentPage(1);
          }}
          className="w-full sm:w-auto p-2 border border-gray-300 rounded-md mb-4 sm:mb-0"
        />
        <button onClick={onCreateZone} className="btn-primary w-full sm:w-auto">
          Create Zone
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
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
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {zones.map((zone) => (
              <tr key={zone.id} className="transition-colors hover:bg-gray-50">
                <td
                  onClick={() =>
                    navigate(
                      `/records?zoneName=${encodeURIComponent(zone.name)}`,
                    )
                  }
                  className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-(--primary)"
                >
                  {zone.name}
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                  {zone.primary_ns}
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                  {zone.admin_email}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => handleShowDetails(zone)}
                      className="font-medium text-green-600 hover:underline"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => onEditZone(zone)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleNotify(zone)}
                      disabled={notifyingZoneName === zone.name}
                      className="font-medium text-amber-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {notifyingZoneName === zone.name
                        ? "Notifying..."
                        : "Notify"}
                    </button>
                    <button
                      onClick={() => handleDelete(zone)}
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
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <ZoneDetails zone={selectedZone} />
        </Modal>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-gray-700">
            {zones.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium">{indexOfFirstZone + 1}</span> to{" "}
                <span className="font-medium">{indexOfLastZone}</span>
              </>
            ) : (
              "No zones found"
            )}
          </p>
        </div>
        <PaginationControls
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
