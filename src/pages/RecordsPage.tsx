import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import RecordList from "@/components/RecordList";
import RecordForm from "@/components/RecordForm";
import Modal from "@/components/Modal";
import { Record, Zone } from "@/lib/types";
import { getZones } from "@/lib/api";

export default function RecordsPage() {
  const [searchParams] = useSearchParams();
  const zoneId = searchParams.get("zoneId");
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const fetchedZones = await getZones();
        setZones(fetchedZones);
      } catch (error) {
        console.error("Failed to fetch zones:", error);
      }
    };
    fetchZones();
  }, []);

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSuccess = () => {
    handleCloseModal();
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">DNS Records</h1>
        <button onClick={handleOpenModal} className="btn-primary">
          Add Record
        </button>
      </div>

      <RecordList
        zoneId={zoneId}
        onEditRecord={handleEditRecord}
        refreshKey={refreshKey}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <RecordForm
          record={editingRecord}
          zones={zones}
          selectedZoneId={zoneId}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      </Modal>
    </div>
  );
}
