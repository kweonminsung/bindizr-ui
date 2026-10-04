import { useState } from "react";
import Modal from "@/components/Modal";
import RoleDetails from "@/components/RoleDetails";
import RoleForm from "@/components/RoleForm";
import RoleList from "@/components/RoleList";
import { Role } from "@/lib/types";

export default function RolesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [createdRole, setCreatedRole] = useState<Role | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (role: Role) => {
    setIsFormOpen(false);
    setRefreshKey((prev) => prev + 1);
    // Straight to its grants: a role without any lets nothing through.
    setCreatedRole(role);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Roles hold the grants API tokens and TSIG keys act under. Open a role to
        manage its grants.
      </p>
      <RoleList key={refreshKey} onCreateRole={() => setIsFormOpen(true)} />
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
