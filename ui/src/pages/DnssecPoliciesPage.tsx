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
        DNSSEC policies are named signing-parameter bundles. Apply one from a
        zone&apos;s DNSSEC tab: pick it when enabling DNSSEC, or move a signed
        zone to it later.
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
