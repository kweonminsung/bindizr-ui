import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getZones, deleteZone } from "@/lib/api";
import { Zone } from "@/lib/types";
import Modal from "./Modal";
import ZoneDetails from "./ZoneDetails";
import HistoryList from "./HistoryList";

interface ZoneListProps {
  onEditZone: (zone: Zone) => void;
}

export default function ZoneList({ onEditZone }: ZoneListProps) {
  const navigate = useNavigate();
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zonesPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchZones() {
      try {
        const data = await getZones();
        setZones(data);
      } catch (err) {
        setError("Failed to fetch zones");
      } finally {
        setLoading(false);
      }
    }
    fetchZones();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this zone?")) {
      try {
        await deleteZone(id);
        setZones(zones.filter((zone) => zone.id !== id));
      } catch (error) {
        alert("Failed to delete zone");
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

  const handleShowHistories = (zone: Zone) => {
    setSelectedZone(zone);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistories = () => {
    setSelectedZone(null);
    setIsHistoryModalOpen(false);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading zones...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const filteredZones = zones.filter((zone) =>
    zone.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastZone = currentPage * zonesPerPage;
  const indexOfFirstZone = indexOfLastZone - zonesPerPage;
  const currentZones = filteredZones.slice(indexOfFirstZone, indexOfLastZone);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search zones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
      </div>
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
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Primary NS
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
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
          {currentZones.map((zone) => (
            <tr key={zone.id} className="transition-colors hover:bg-gray-50">
              <td
                onClick={() => navigate(`/records?zoneId=${zone.id}`)}
                className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-(--primary)"
              >
                {zone.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                {zone.primary_ns}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                {zone.admin_email}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  onClick={() => handleShowDetails(zone)}
                  className="mr-4 font-medium text-green-600 hover:underline"
                >
                  Details
                </button>
                <button
                  onClick={() => handleShowHistories(zone)}
                  className="mr-4 font-medium text-purple-600 hover:underline"
                >
                  Histories
                </button>
                <button
                  onClick={() => onEditZone(zone)}
                  className="mr-4 font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(zone.id)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedZone && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <ZoneDetails zone={selectedZone} />
        </Modal>
      )}
      {selectedZone && (
        <Modal isOpen={isHistoryModalOpen} onClose={handleCloseHistories}>
          <HistoryList resourceId={selectedZone.id} resourceType="zone" />
        </Modal>
      )}
      <div className="flex justify-between items-center p-4">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstZone + 1}</span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastZone, filteredZones.length)}
            </span>{" "}
            of <span className="font-medium">{filteredZones.length}</span>{" "}
            results
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex">
            {Array.from(
              { length: Math.ceil(filteredZones.length / zonesPerPage) },
              (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`px-3 py-1 mx-1 rounded-md text-sm font-medium ${
                    currentPage === i + 1
                      ? "bg-(--primary) text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
