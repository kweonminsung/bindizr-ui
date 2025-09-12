'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RecordList from '@/components/RecordList';
import RecordForm from '@/components/RecordForm';
import Modal from '@/components/Modal';
import { Record } from '@/lib/types';

function RecordsContent() {
  const searchParams = useSearchParams();
  const zoneId = searchParams.get('zoneId');
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Records</h1>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Record
        </button>
      </div>
      <RecordList
        onEditRecord={handleEditRecord}
        zoneId={zoneId ? parseInt(zoneId) : undefined}
      />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <RecordForm
          record={editingRecord}
          onSuccess={handleCloseModal}
          zoneId={zoneId ? parseInt(zoneId) : undefined}
        />
      </Modal>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RecordsContent />
    </Suspense>
  );
}
