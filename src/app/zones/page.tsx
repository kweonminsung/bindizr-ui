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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Zones</h1>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Zone
        </button>
      </div>
      <ZoneList onEditZone={handleEditZone} />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm zone={editingZone} onSuccess={handleCloseModal} />
      </Modal>
    </div>
  );
}
