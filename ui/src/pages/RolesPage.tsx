import { useState } from "react";
import Modal from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import RoleDetails from "@/components/RoleDetails";
import RoleForm from "@/components/RoleForm";
import RoleList from "@/components/RoleList";
import { RoleResponse } from "@/lib/types";

export default function RolesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdRole, setCreatedRole] = useState<RoleResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (role: RoleResponse) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    // Straight to its grants: a role without any lets nothing through.
    setCreatedRole(role);
  };

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Open a role to manage the grants its API tokens and TSIG keys act under."
        actions={
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="btn-primary"
          >
            Create Role
          </button>
        }
      />
      <RoleList key={refreshKey} />
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)}>
        <RoleForm
          onSuccess={handleCreated}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
      {createdRole && (
        <Modal
          isOpen
          wide
          structured
          onClose={() => {
            setCreatedRole(null);
            setRefreshKey((prev) => prev + 1);
          }}
        >
          <RoleDetails role={createdRole} />
        </Modal>
      )}
    </div>
  );
}
