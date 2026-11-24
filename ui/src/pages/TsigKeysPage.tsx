import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import TsigKeyDetails from "@/components/TsigKeyDetails";
import TsigKeyForm from "@/components/TsigKeyForm";
import TsigKeyList from "@/components/TsigKeyList";
import { TsigKeyWithSecret } from "@/lib/types";

export default function TsigKeysPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<TsigKeyWithSecret | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // The role filter lives in the URL, so a filtered listing can be linked.
  const [searchParams, setSearchParams] = useSearchParams();
  const roleName =
    searchParams.get("role_name") ?? searchParams.get("role") ?? "";

  const handleRoleNameChange = (name: string) => {
    setSearchParams(name ? { role_name: name } : {}, { replace: true });
  };

  const handleCreated = (tsigKey: TsigKeyWithSecret) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    setCreatedKey(tsigKey);
  };

  return (
    <div>
      <PageHeader
        title="TSIG Keys"
        description="TSIG keys authenticate nsupdate clients and zone transfers. Each key acts under its role's grants."
        actions={
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="btn-primary"
          >
            Create TSIG Key
          </button>
        }
      />
      <TsigKeyList
        key={refreshKey}
        roleName={roleName || undefined}
        onRoleNameChange={handleRoleNameChange}
      />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <TsigKeyForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
      {createdKey && (
        <Modal isOpen wide onClose={() => setCreatedKey(null)}>
          <TsigKeyDetails tsigKey={createdKey} isNew />
        </Modal>
      )}
    </div>
  );
}
