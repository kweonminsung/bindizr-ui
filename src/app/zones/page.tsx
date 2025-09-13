'use client';

import { useState } from 'react';
import ZoneList from '@/components/ZoneList';
import ZoneForm from '@/components/ZoneForm';
import Modal from '@/components/Modal';
import { Zone } from '@/lib/types';

export default function ZonesPage() {
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <div>
      <ZoneList onEditZone={handleEditZone} onCreateZone={handleOpenModal} />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm zone={editingZone} onSuccess={handleCloseModal} />
      </Modal>
    </div>
  );
}
