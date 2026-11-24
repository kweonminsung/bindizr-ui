import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import TokenDetails from "@/components/TokenDetails";
import TokenForm from "@/components/TokenForm";
import TokenList from "@/components/TokenList";
import { CreateApiTokenResponse } from "@/lib/types";

export default function TokensPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdToken, setCreatedToken] =
    useState<CreateApiTokenResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // The role filter lives in the URL, so a filtered listing can be linked.
  const [searchParams, setSearchParams] = useSearchParams();
  const roleName =
    searchParams.get("role_name") ?? searchParams.get("role") ?? "";

  const handleRoleNameChange = (name: string) => {
    setSearchParams(name ? { role_name: name } : {}, { replace: true });
  };

  const handleCreated = (created: CreateApiTokenResponse) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    setCreatedToken(created);
  };

  return (
    <div>
      <PageHeader
        title="API Tokens"
        description="API tokens authenticate HTTP API clients. Each token acts under its role's grants."
        actions={
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="btn-primary"
          >
            Create API Token
          </button>
        }
      />
      <TokenList
        key={refreshKey}
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
