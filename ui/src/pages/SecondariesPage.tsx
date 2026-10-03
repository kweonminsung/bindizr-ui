import { useState } from "react";
import Modal from "@/components/Modal";
import SecondaryForm from "@/components/SecondaryForm";
import SecondaryList from "@/components/SecondaryList";

export default function SecondariesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        The servers Bindizr feeds: each receives NOTIFY for every zone and may
        pull zones from its address.
      </p>
      <SecondaryList
        key={refreshKey}
        onCreateSecondary={() => setIsFormOpen(true)}
      />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <SecondaryForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
