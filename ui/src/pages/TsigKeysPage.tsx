import { useState } from "react";
import Modal from "@/components/Modal";
import TsigKeyDetails from "@/components/TsigKeyDetails";
import TsigKeyForm from "@/components/TsigKeyForm";
import TsigKeyList from "@/components/TsigKeyList";
import { TsigKey } from "@/lib/types";

export default function TsigKeysPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<TsigKey | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (tsigKey: TsigKey) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    setCreatedKey(tsigKey);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        TSIG keys authenticate dynamic-update (nsupdate) clients. A Scoped Key
        acts only in the zones it is granted; open a key to grant or revoke zone
        access.
      </p>
      <TsigKeyList key={refreshKey} onCreateKey={() => setIsFormOpen(true)} />
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
