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
      <RecordList
        onEditRecord={handleEditRecord}
        onCreateRecord={handleOpenModal}
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
    <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
      <RecordsContent />
    </Suspense>
  );
}
