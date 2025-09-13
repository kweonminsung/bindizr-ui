'use client';

import { useState } from 'react';
import ZoneList from '@/components/ZoneList';
import ZoneForm from '@/components/ZoneForm';
import Modal from '@/components/Modal';
import { Zone } from '@/lib/types';

export default function ZonesPage() {
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingZone(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingZone(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div>
      <ZoneList
        key={refreshKey}
        onEditZone={handleEditZone}
        onCreateZone={handleOpenModal}
      />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm zone={editingZone} onSuccess={handleSuccess} />
      </Modal>
    </div>
  );
}
