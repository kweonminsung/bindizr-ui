import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import RecordList from "@/components/RecordList";
import RecordForm from "@/components/RecordForm";
import Modal from "@/components/Modal";
import { useToast } from "@/contexts/ToastContext";
import { Zone } from "@/lib/types";
import { getZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function RecordsPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const zoneName = searchParams.get("zoneName")?.trim() || undefined;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchZones = async () => {
      try {
        const fetchedZones = await getZones();
        if (active) {
          setZones(fetchedZones);
        }
      } catch (error) {
        if (active) {
          toast.error(getErrorMessage(error, "Failed to fetch zones"));
        }
      }
    };
    fetchZones();
    return () => {
      active = false;
    };
  }, [toast]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    handleCloseModal();
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        The records of every zone, or of the one chosen. Records sharing a name
        and type share one TTL.
      </p>
      <RecordList
        key={refreshKey}
        onCreateRecord={() => setIsModalOpen(true)}
        zoneName={zoneName}
        zones={zones}
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
