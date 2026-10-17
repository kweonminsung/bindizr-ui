import { useState } from "react";
import ImportZonesForm from "@/components/ImportZonesForm";
import ZoneList from "@/components/ZoneList";
import ZoneForm from "@/components/ZoneForm";
import Modal from "@/components/Modal";

export default function ZonesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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
      <ZoneList
        key={refreshKey}
        onCreateZone={() => setIsModalOpen(true)}
        onImportZones={() => setIsImportOpen(true)}
      />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <ZoneForm
          zone={null}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>
      <Modal isOpen={isImportOpen} wide onClose={() => setIsImportOpen(false)}>
        <ImportZonesForm onApplied={() => setRefreshKey((prev) => prev + 1)} />
      </Modal>
    </div>
  );
}
