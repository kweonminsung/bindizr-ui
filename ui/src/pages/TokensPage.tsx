import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "@/components/Modal";
import TokenDetails from "@/components/TokenDetails";
import TokenForm from "@/components/TokenForm";
import TokenList from "@/components/TokenList";
import { CreatedToken } from "@/lib/types";

export default function TokensPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // The role filter lives in the URL, so a filtered listing can be linked.
  const [searchParams, setSearchParams] = useSearchParams();
  const roleName = searchParams.get("role") ?? "";

  const handleRoleNameChange = (name: string) => {
    setSearchParams(name ? { role: name } : {}, { replace: true });
  };

  const handleCreated = (created: CreatedToken) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    setCreatedToken(created);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        API tokens authenticate HTTP API clients. Each token acts under its
        role&apos;s grants.
      </p>
      <TokenList
        key={refreshKey}
        onCreateToken={() => setIsFormOpen(true)}
        roleName={roleName || undefined}
        onRoleNameChange={handleRoleNameChange}
      />
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
