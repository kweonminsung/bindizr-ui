import { useState } from "react";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import SecondaryForm from "@/components/SecondaryForm";
import SecondaryList from "@/components/SecondaryList";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";

export default function SecondariesPage() {
  const { allows } = useBindizrToken();
  const canManage = allows("secondary:manage");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div>
      <PageHeader
        title="Secondaries"
        description="Registered secondary servers receive NOTIFY for all zones and can request zone transfers from their addresses."
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="btn-primary"
            >
              Register Secondary
            </button>
          )
        }
      />
      <SecondaryList key={refreshKey} canManage={canManage} />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <SecondaryForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
