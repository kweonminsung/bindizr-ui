import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRoles } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Role } from "@/lib/types";
import Notice from "./Notice";

interface RoleSelectProps {
  id: string;
  value: string;
  onChange: (roleName: string) => void;
  /** What the credential does with the role's grants, shown under the field. */
  hint: string;
  /** Shows the value without letting it change. */
  fixed?: boolean;
}

/** A required pick of the role a new credential authenticates into. */
export default function RoleSelect({
  id,
  value,
  onChange,
  hint,
  fixed = false,
}: RoleSelectProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRoles()
      .then((loaded) => {
        if (active) setRoles(loaded);
      })
      .catch((loadError) => {
        if (active)
          setError(getErrorMessage(loadError, "Failed to fetch roles"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-600 mb-1"
      >
        Role
      </label>
      {error ? (
        <Notice tone="error">{error}</Notice>
      ) : (
        <select
          id={id}
          name="role_name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          disabled={loading || fixed}
          className="w-full"
        >
          <option value="">
            {loading ? "Loading roles..." : "Select a role"}
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.name}>
              {role.builtin ? `${role.name} (built-in)` : role.name}
            </option>
          ))}
        </select>
      )}
      <p className="text-xs text-gray-500 mt-1">
        {hint}{" "}
        <Link to="/access/roles" className="text-blue-600 hover:underline">
          Manage roles
        </Link>
        .
      </p>
    </div>
  );
}
