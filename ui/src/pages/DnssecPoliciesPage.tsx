import { useState } from "react";
import DnssecPolicyForm from "@/components/DnssecPolicyForm";
import DnssecPolicyList from "@/components/DnssecPolicyList";
import Modal from "@/components/Modal";

export default function DnssecPoliciesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Signing parameter sets for zones. Apply a policy from a zone&apos;s
        DNSSEC tab.
      </p>
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
