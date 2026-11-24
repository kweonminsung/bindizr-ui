import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import RecordList from "@/components/RecordList";
import RecordForm from "@/components/RecordForm";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";
import { ZoneResponse } from "@/lib/types";
import { getZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function RecordsPage() {
  const toast = useToast();
  const { canCreateRecords } = useBindizrToken();
  const [searchParams] = useSearchParams();
  const zoneName =
    (searchParams.get("zone_name") ?? searchParams.get("zoneName"))?.trim() ||
    undefined;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zones, setZones] = useState<ZoneResponse[]>([]);
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
      <PageHeader
        title="Records"
        description="Records with the same name and type in a zone share a TTL."
        actions={
          canCreateRecords(zoneName) && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
            >
              Create Record
            </button>
          )
        }
      />
      <RecordList key={refreshKey} zoneName={zoneName} zones={zones} />
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
