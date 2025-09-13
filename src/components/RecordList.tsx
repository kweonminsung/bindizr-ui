'use client';

import { useEffect, useState } from 'react';
import { getRecords, deleteRecord } from '@/lib/api';
import { Record } from '@/lib/types';
import Modal from './Modal';
import RecordDetails from './RecordDetails';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(10);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const data = await getRecords(zoneId);
        setRecords(data);
      } catch (err) {
        setError('Failed to fetch records');
      } finally {
        setLoading(false);
      }
    }
    fetchRecords();
  }, [zoneId]);

  const handleDelete = async (id: number) => {
    try {
      await deleteRecord(id);
      setRecords(records.filter(record => record.id !== id));
    } catch (error) {
      alert('Failed to delete record');
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

  if (loading) {
    return <p className="text-center text-gray-500">Loading records...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = records.slice(indexOfFirstRecord, indexOfLastRecord);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
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
          {currentRecords.map(record => (
            <tr key={record.id} className="transition-colors hover:bg-gray-50">
              <td
                onClick={() => handleShowDetails(record)}
                className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 cursor-pointer hover:text-primary"
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
      <div className="flex justify-between items-center p-4">
        <div>
          <p className="text-sm text-gray-700">
            Showing{' '}
            <span className="font-medium">{indexOfFirstRecord + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(indexOfLastRecord, records.length)}
            </span>{' '}
            of <span className="font-medium">{records.length}</span> results
          </p>
        </div>
        <div className="flex items-center">
          <div className="flex">
            {Array.from(
              { length: Math.ceil(records.length / recordsPerPage) },
              (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`px-3 py-1 mx-1 rounded-md text-sm font-medium ${
                    currentPage === i + 1
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
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
