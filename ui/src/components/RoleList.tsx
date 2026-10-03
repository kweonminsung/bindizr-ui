import { useEffect, useState } from "react";
import { deleteRole, getRoles } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { Role } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import BuiltinBadge from "./BuiltinBadge";
import RoleDetails from "./RoleDetails";
import { useToast } from "@/contexts/ToastContext";

interface RoleListProps {
  onCreateRole: () => void;
}

/** Whether a token or key still authenticates into the role. */
const isHeld = (role: Role) => role.token_count + role.tsig_key_count > 0;

/** "2 API tokens and 1 TSIG key", naming only the kinds present. */
const describeHolders = (role: Role) => {
  const counted = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (role.token_count > 0) parts.push(counted(role.token_count, "API token"));
  if (role.tsig_key_count > 0) {
    parts.push(counted(role.tsig_key_count, "TSIG key"));
  }
  return parts.join(" and ");
};

const HEADER =
  "px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider";

export default function RoleList({ onCreateRole }: RoleListProps) {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchRoles() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRoles();
        if (active) {
          setRoles(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch roles"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRoles();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Delete "${role.name}" and its grants?`)) {
      return;
    }

    try {
      toast.success(await deleteRole(role.name));
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      // A 409 names the tokens and keys still holding the role.
      toast.error(getErrorMessage(deleteError, "Failed to delete role"));
    }
  };

  if (loading && roles.length === 0) {
    return <p className="text-center text-gray-500">Loading roles...</p>;
  }
  if (error) {
    return <Notice tone="error">{error}</Notice>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleRoles = query
    ? roles.filter((role) => role.name.toLowerCase().includes(query))
    : roles;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto mb-4 sm:mb-0"
        />
        <button onClick={onCreateRole} className="btn-primary w-full sm:w-auto">
          Create Role
        </button>
      </div>
      <div className="overflow-x-auto">
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th scope="col" className={HEADER}>
                Name
              </th>
              <th scope="col" className={`hidden sm:table-cell w-24 ${HEADER}`}>
                Grants
              </th>
              <th scope="col" className={`hidden sm:table-cell w-24 ${HEADER}`}>
                Tokens
              </th>
              <th
                scope="col"
                className={`hidden sm:table-cell w-32 whitespace-nowrap ${HEADER}`}
              >
                TSIG Keys
              </th>
              <th scope="col" className={`hidden md:table-cell ${HEADER}`}>
                Description
              </th>
              <th scope="col" className={`hidden md:table-cell ${HEADER}`}>
                Created
              </th>
              <th scope="col" className={`w-24 text-right ${HEADER}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleRoles.map((role) => (
              <tr
                key={role.id}
                {...clickableRowProps(() => setSelectedRole(role))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  <span className="inline-flex items-center gap-2">
                    {role.name}
                    {role.builtin && (
                      <BuiltinBadge title="The built-in role cannot be changed or deleted" />
                    )}
                  </span>
                </td>
                <td
                  className={`hidden sm:table-cell px-6 py-4 ${
                    role.grant_count === 0 ? "text-gray-400" : "text-gray-700"
                  }`}
                  title={
                    role.grant_count === 0
                      ? "No grants: tokens and keys in this role may do nothing"
                      : undefined
                  }
                >
                  {role.grant_count}
                </td>
                <td className="hidden sm:table-cell px-6 py-4 text-gray-700">
                  {role.token_count}
                </td>
                <td className="hidden sm:table-cell px-6 py-4 text-gray-700">
                  {role.tsig_key_count}
                </td>
                <td
                  className="hidden md:table-cell truncate px-6 py-4 text-gray-500"
                  title={role.description ?? undefined}
                >
                  {role.description || "-"}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {formatDateTime(role.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {!role.builtin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(role);
                      }}
                      disabled={isHeld(role)}
                      title={
                        isHeld(role)
                          ? `Held by ${describeHolders(role)}; delete or move them first`
                          : undefined
                      }
                      className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedRole && (
        <Modal
          isOpen
          wide
          onClose={() => {
            setSelectedRole(null);
            // Its tabs may have added or removed tokens, keys, or grants.
            setRefreshKey((prev) => prev + 1);
          }}
        >
          <RoleDetails role={selectedRole} />
        </Modal>
      )}
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {visibleRoles.length > 0
            ? `${visibleRoles.length} role${visibleRoles.length > 1 ? "s" : ""}`
            : "No roles found"}
        </p>
      </div>
    </div>
  );
}
