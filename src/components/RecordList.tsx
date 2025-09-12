'use client';

import { useEffect, useState } from 'react';
import { getRecords, deleteRecord } from '@/lib/api';
import { Record } from '@/lib/types';
import Modal from './Modal';
import RecordDetails from './RecordDetails';

interface RecordListProps {
  zoneId?: number;
  onEditRecord: (record: Record) => void;
}

export default function RecordList({ zoneId, onEditRecord }: RecordListProps) {
  const [records, setRecords] = useState<Record[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return (
      <p className="text-center text-text-secondary">Loading records...</p>
    );
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm font-light">
        <thead className="border-b border-border-color font-medium">
          <tr>
            <th scope="col" className="px-6 py-4 text-text-secondary">
              Name
            </th>
            <th scope="col" className="px-6 py-4 text-text-secondary">
              Type
            </th>
            <th scope="col" className="px-6 py-4 text-text-secondary">
              Value
            </th>
            <th
              scope="col"
              className="px-6 py-4 text-right text-text-secondary"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map(record => (
            <tr
              key={record.id}
              className="border-b border-border-color transition-colors hover:bg-background-light"
            >
              <td
                onClick={() => handleShowDetails(record)}
                className="whitespace-nowrap px-6 py-4 font-medium cursor-pointer hover:text-primary"
              >
                {record.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                {record.record_type}
              </td>
              <td className="whitespace-nowrap px-6 py-4 truncate max-w-xs">
                {record.value}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  onClick={() => onEditRecord(record)}
                  className="mr-4 font-medium text-secondary hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(record.id)}
                  className="font-medium text-red-500 hover:underline"
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
    </div>
  );
}
