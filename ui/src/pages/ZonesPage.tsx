import { useState } from "react";
import ZoneList from "@/components/ZoneList";
import ZoneForm from "@/components/ZoneForm";
import Modal from "@/components/Modal";
import Notice from "@/components/Notice";
import { Zone } from "@/lib/types";

export default function ZonesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = (_zone: Zone, importWarning?: string) => {
    handleCloseModal();
    setWarning(importWarning ?? null);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      {warning && (
        <Notice tone="warning" className="mb-4">
          {warning}
        </Notice>
      )}
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
