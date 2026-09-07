import { useState } from "react";
import ZoneList from "@/components/ZoneList";
import ZoneForm from "@/components/ZoneForm";
import Modal from "@/components/Modal";

export default function ZonesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <ZoneList key={refreshKey} onCreateZone={() => setIsModalOpen(true)} />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm
          zone={null}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
