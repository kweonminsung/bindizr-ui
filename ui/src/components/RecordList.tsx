import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getRecordsPage, deleteRecord } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  getPageFromSearchParams,
  updatePageSearchParam,
} from "@/lib/pageQuery";
import { Record, RECORD_TYPES, RecordType } from "@/lib/types";
import { formatRecordValue } from "@/lib/recordValue";
import Modal from "./Modal";
import PaginationControls from "./PaginationControls";
import RecordDetails from "./RecordDetails";

interface RecordListProps {
  zoneName?: string;
  onEditRecord: (record: Record) => void;
  onCreateRecord: () => void;
}

export default function RecordList({
  zoneName,
  onEditRecord,
  onCreateRecord,
}: RecordListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentPage = getPageFromSearchParams(searchParams);
  const recordsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<RecordType | "">("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePageChange = (page: number) => {
    setSearchParams(updatePageSearchParam(searchParams, page));
  };

  useEffect(() => {
    let active = true;

    async function fetchRecords() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRecordsPage({
          zone_name: zoneName,
          search: searchQuery,
          record_type: selectedType,
          limit: recordsPerPage,
          offset: (currentPage - 1) * recordsPerPage,
        });
        if (active) {
          setRecords(data.items);
          setTotalRecords(data.pagination.total);
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, "Failed to fetch records"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRecords();

    return () => {
      active = false;
    };
  }, [currentPage, refreshKey, searchQuery, selectedType, zoneName]);

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteRecord(id);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        alert(getErrorMessage(error, "Failed to delete record"));
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

  if (
    loading &&
    records.length === 0 &&
    searchQuery === "" &&
    selectedType === "" &&
    currentPage === 1
  ) {
    return <p className="text-center text-gray-500">Loading records...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const indexOfFirstRecord = (currentPage - 1) * recordsPerPage;
  const indexOfLastRecord = indexOfFirstRecord + records.length;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handlePageChange(1);
            }}
            className="w-full sm:w-auto p-2 border border-gray-300 rounded-md mb-4 sm:mb-0 sm:mr-4"
          />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as RecordType | "");
              handlePageChange(1);
            }}
            className="w-full sm:w-auto p-2 border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onCreateRecord}
          className="btn-primary w-full sm:w-auto mt-4 sm:mt-0"
        >
          Create Record
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
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
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
            {records.map((record) => (
              <tr
                key={record.id}
                className="transition-colors hover:bg-gray-50"
              >
                <td
                  onClick={() => handleShowDetails(record)}
                  className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-(--primary)"
                >
                  {record.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                  {record.record_type}
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500 truncate max-w-xs">
                  {formatRecordValue(record.value)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => onEditRecord(record)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
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
      {selectedRecord && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <RecordDetails record={selectedRecord} />
        </Modal>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-center p-4">
        <div className="mb-4 sm:mb-0">
          <p className="text-sm text-gray-700">
            {records.length > 0 ? (
              <>
                Showing{" "}
                <span className="font-medium">{indexOfFirstRecord + 1}</span> to{" "}
                <span className="font-medium">{indexOfLastRecord}</span> of{" "}
                <span className="font-medium">{totalRecords}</span>
              </>
            ) : (
              "No records found"
            )}
          </p>
        </div>
        <PaginationControls
          currentPage={currentPage}
          pageSize={recordsPerPage}
          totalItems={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
