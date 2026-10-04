import { useEffect, useState } from "react";
import { getRoles } from "@/lib/api";
import { Role } from "@/lib/types";

interface RoleFilterSelectProps {
  /** The selected role's name; empty for every role. */
  value: string;
  onChange: (roleName: string) => void;
}

/** Narrows a credential listing to one role. */
export default function RoleFilterSelect({
  value,
  onChange,
}: RoleFilterSelectProps) {
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    let active = true;
    // Without the list the filter still offers "All roles", so a failure
    // here leaves the listing usable.
    getRoles()
      .then((loaded) => {
        if (active) setRoles(loaded);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <select
      aria-label="Filter by role"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full sm:w-auto"
    >
      <option value="">All roles</option>
      {/* The selected role stays listed before the roles have loaded. */}
      {value && !roles.some((role) => role.name === value) && (
        <option value={value}>{value}</option>
      )}
      {roles.map((role) => (
        <option key={role.id} value={role.name}>
          {role.builtin ? `${role.name} (built-in)` : role.name}
        </option>
      ))}
    </select>
  );
}
