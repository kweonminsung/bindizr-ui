import { useState } from "react";
import DnssecPolicyForm from "@/components/DnssecPolicyForm";
import DnssecPolicyList from "@/components/DnssecPolicyList";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";

/** The signing-parameter bundles zones sign under, with their form. */
export default function DnssecPoliciesPage() {
  const { allows } = useBindizrToken();
  const canManage = allows("dnssec:manage");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <PageHeader
        title="DNSSEC Policies"
        description="Apply signing policies from a zone's DNSSEC tab."
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="btn-primary"
            >
              Create Policy
            </button>
          )
        }
      />
      <DnssecPolicyList key={refreshKey} canManage={canManage} />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <DnssecPolicyForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
