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
        <h1 className="text-3xl font-bold text-white">Manage Zones</h1>
        <button onClick={handleOpenModal} className="btn-primary">
          Create Zone
        </button>
      </div>
      <div className="bg-background-dark p-6 rounded-lg shadow-xl">
        <ZoneList onEditZone={handleEditZone} />
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm zone={editingZone} onSuccess={handleCloseModal} />
      </Modal>
    </div>
  );
}
