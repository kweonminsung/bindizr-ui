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

  if (loading) return <p>Loading records...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Records</h2>
      <ul className="space-y-2">
        {records.map(record => (
          <li
            key={record.id}
            className="p-2 border rounded flex justify-between items-center"
          >
            <span
              onClick={() => handleShowDetails(record)}
              className="cursor-pointer"
            >
              <strong>{record.name}</strong> {record.record_type} {record.value}
            </span>
            <div>
              <button
                onClick={() => onEditRecord(record)}
                className="mr-2 px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(record.id)}
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {selectedRecord && (
        <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetails}>
          <RecordDetails record={selectedRecord} />
        </Modal>
      )}
    </div>
  );
}
