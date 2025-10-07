import { useEffect, useState } from "react";
import { getRecords, deleteRecord } from "@/lib/api";
import { Record } from "@/lib/types";
import Modal from "./Modal";
import RecordDetails from "./RecordDetails";
import HistoryList from "./HistoryList";

interface RecordListProps {
  zoneId?: number;
  onEditRecord: (record: Record) => void;
  onCreateRecord: () => void;
}

export default function RecordList({
  zoneId,
  onEditRecord,
  onCreateRecord,
}: RecordListProps) {
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");

  useEffect(() => {
    async function fetchRecords() {
      try {
        const data = await getRecords(zoneId);
        setRecords(data);
      } catch (err) {
        setError("Failed to fetch records");
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [zoneId]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteRecord(id);
        setRecords(records.filter((record) => record.id !== id));
      } catch (error) {
        alert("Failed to delete record");
      }
    }
  };

  const handleShowDetails = (record: Record) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetails = () => {
    setSelectedRecord(null);
    setIsDetailModalOpen(false);
  };

  const handleShowHistories = (record: Record) => {
    setSelectedRecord(record);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistories = () => {
    setSelectedRecord(null);
    setIsHistoryModalOpen(false);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading records...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const recordTypes = [...new Set(records.map((record) => record.record_type))];

  const filteredRecords = records
    .filter((record) =>
      record.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((record) =>
      selectedType ? record.record_type === selectedType : true
    );

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex space-x-4">
        <input
          type="text"
          placeholder="Search records..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="p-2 border border-gray-300 rounded-md"
        >
          <option value="">All Types</option>
          {recordTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Type
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Value
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
          {currentRecords.map((record) => (
            <tr key={record.id} className="transition-colors hover:bg-gray-50">
              <td
                onClick={() => handleShowDetails(record)}
                className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-(--primary)"
              >
                {record.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                {record.record_type}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-gray-500 truncate max-w-xs">
                {record.value}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  onClick={() => handleShowHistories(record)}
                  className="mr-4 font-medium text-purple-600 hover:underline"
                >
                  Histories
                </button>
                <button
                  onClick={() => onEditRecord(record)}
                  className="mr-4 font-medium text-blue-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedRecord && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <RecordDetails record={selectedRecord} />
        </Modal>
      )}
      {selectedRecord && (
        <Modal isOpen={isHistoryModalOpen} onClose={handleCloseHistories}>
          <HistoryList resourceId={selectedRecord.id} resourceType="record" />
        </Modal>
      )}
      <div className="flex justify-between items-center p-4">
        <div>
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{indexOfFirstRecord + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastRecord, filteredRecords.length)}
            </span>{" "}
            of <span className="font-medium">{filteredRecords.length}</span>{" "}
            results
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex">
            {Array.from(
              { length: Math.ceil(filteredRecords.length / recordsPerPage) },
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
          <button onClick={onCreateRecord} className="btn-primary ml-4">
            Create Record
          </button>
        </div>
      </div>
    </div>
  );
}
