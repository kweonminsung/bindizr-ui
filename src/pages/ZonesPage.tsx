import { useState } from "react";
import ZoneList from "@/components/ZoneList";
import ZoneForm from "@/components/ZoneForm";
import Modal from "@/components/Modal";
import { Zone } from "@/lib/types";

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
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">DNS Zones</h1>
        <button onClick={handleOpenModal} className="btn-primary">
          Add Zone
        </button>
      </div>

      <ZoneList onEditZone={handleEditZone} />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm
          zone={editingZone}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      </Modal>
    </div>
  );
}
