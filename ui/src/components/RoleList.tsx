import { useEffect, useState } from "react";
import { deleteRole, getRoles } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { RoleResponse } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import BuiltinBadge from "./BuiltinBadge";
import RoleDetails from "./RoleDetails";
import { useToast } from "@/contexts/ToastContext";
import { SortValue } from "@/lib/sort";
import { useRowSort } from "@/lib/useRowSort";
import {
  describeCount,
  ListFooter,
  ListToolbar,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import SortControl from "./SortControl";

interface RoleListProps {
  onCreateRole: () => void;
}

/** Whether a token or key still authenticates into the role. */
const isHeld = (role: RoleResponse) =>
  role.token_count + role.tsig_key_count > 0;

/** "2 API tokens and 1 TSIG key", naming only the kinds present. */
const describeHolders = (role: RoleResponse) => {
  const counted = (count: number, noun: string) =>
    `${count} ${noun}${count === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (role.token_count > 0) parts.push(counted(role.token_count, "API token"));
  if (role.tsig_key_count > 0) {
    parts.push(counted(role.tsig_key_count, "TSIG key"));
  }
  return parts.join(" and ");
};

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "grant_count", label: "Grants" },
  { value: "credential_count", label: "Tokens and keys" },
  { value: "created_at", label: "Created" },
] as const;

type RoleSortField = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: Record<RoleSortField, (role: RoleResponse) => SortValue> = {
  name: (role) => role.name,
  grant_count: (role) => role.grant_count,
  credential_count: (role) => role.token_count + role.tsig_key_count,
  created_at: (role) => role.created_at,
};

export default function RoleList({ onCreateRole }: RoleListProps) {
  const toast = useToast();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const rowSort = useRowSort(SORT_VALUES, "name");

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

  const handleDelete = async (role: RoleResponse) => {
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

  if (loading && roles.length === 0 && !error) {
    return <p className="text-center text-gray-500">Loading roles...</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleRoles = rowSort.sorted(
    roles.filter((role) => role.name.toLowerCase().includes(query)),
  );

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <ListToolbar
        actions={
          <>
            <SortControl
              options={SORT_OPTIONS}
              sort={rowSort.sort}
              order={rowSort.order}
              onChange={rowSort.onChange}
            />
            <button
              onClick={onCreateRole}
              className="btn-primary w-full sm:w-auto"
            >
              Create Role
            </button>
          </>
        }
      >
        <input
          type="text"
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto"
        />
      </ListToolbar>
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
        </Notice>
      )}
      <div className={`overflow-x-auto ${error ? "opacity-60" : ""}`}>
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Name
              </th>
              <th
                scope="col"
                className={`hidden sm:table-cell w-24 ${TABLE_HEADER_CLASS}`}
              >
                Grants
              </th>
              <th
                scope="col"
                className={`hidden sm:table-cell w-24 ${TABLE_HEADER_CLASS}`}
              >
                Tokens
              </th>
              <th
                scope="col"
                className={`hidden sm:table-cell w-32 whitespace-nowrap ${TABLE_HEADER_CLASS}`}
              >
                TSIG Keys
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Description
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Created
              </th>
              <th
                scope="col"
                className={`w-24 text-right ${TABLE_HEADER_CLASS}`}
              >
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
      <ListFooter
        summary={describeCount(visibleRoles.length, "role", "roles")}
      />
    </div>
  );
}
