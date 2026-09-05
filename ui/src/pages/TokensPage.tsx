import { useState } from "react";
import Modal from "@/components/Modal";
import TokenDetails from "@/components/TokenDetails";
import TokenForm from "@/components/TokenForm";
import TokenList from "@/components/TokenList";
import { CreatedToken } from "@/lib/types";

export default function TokensPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (created: CreatedToken) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    setCreatedToken(created);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        API tokens authenticate HTTP API clients. A Scoped Token acts only in
        the zones it is granted; open a token to grant or revoke zone access.
      </p>
      <TokenList key={refreshKey} onCreateToken={() => setIsFormOpen(true)} />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <TokenForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
      {createdToken && (
        <Modal isOpen wide onClose={() => setCreatedToken(null)}>
          <TokenDetails
            token={createdToken.token}
            secret={createdToken.secret}
          />
        </Modal>
      )}
    </div>
  );
}
