import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import RecordList from "@/components/RecordList";
import RecordForm from "@/components/RecordForm";
import Modal from "@/components/Modal";
import { Zone } from "@/lib/types";
import { getZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function RecordsPage() {
  const [searchParams] = useSearchParams();
  const zoneName = searchParams.get("zoneName")?.trim() || undefined;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const fetchedZones = await getZones();
        setZones(fetchedZones);
      } catch (error) {
        console.error(
          "Failed to fetch zones:",
          getErrorMessage(error, "Failed to fetch zones"),
        );
      }
    };
    fetchZones();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div>
      <RecordList
        key={refreshKey}
        onCreateRecord={() => setIsModalOpen(true)}
        zoneName={zoneName}
      />
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <RecordForm
          record={null}
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
          zoneName={zoneName}
          zones={zones}
        />
      </Modal>
    </div>
  );
}
