import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "@/components/Modal";
import TsigKeyDetails from "@/components/TsigKeyDetails";
import TsigKeyForm from "@/components/TsigKeyForm";
import TsigKeyList from "@/components/TsigKeyList";
import { TsigKey } from "@/lib/types";

export default function TsigKeysPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<TsigKey | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // The role filter lives in the URL, so a filtered listing can be linked.
  const [searchParams, setSearchParams] = useSearchParams();
  const roleName = searchParams.get("role") ?? "";

  const handleRoleNameChange = (name: string) => {
    setSearchParams(name ? { role: name } : {}, { replace: true });
  };

  const handleCreated = (tsigKey: TsigKey) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    setCreatedKey(tsigKey);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        TSIG keys authenticate nsupdate clients and zone transfers. Each key
        acts under its role&apos;s grants.
      </p>
      <TsigKeyList
        key={refreshKey}
        onCreateKey={() => setIsFormOpen(true)}
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
