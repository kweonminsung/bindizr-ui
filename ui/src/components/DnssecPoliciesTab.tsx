import { useState } from "react";
import DnssecPolicyForm from "./DnssecPolicyForm";
import DnssecPolicyList from "./DnssecPolicyList";
import Modal from "./Modal";

/** The signing-parameter bundles zones sign under, with their form. */
export default function DnssecPoliciesTab() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <DnssecPolicyList
        key={refreshKey}
        onCreatePolicy={() => setIsFormOpen(true)}
      />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <DnssecPolicyForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
