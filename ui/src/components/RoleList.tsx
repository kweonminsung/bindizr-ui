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
  ListCard,
  ListFooter,
  LIST_FIELD_CLASS,
  ListToolbar,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import SortControl from "./SortControl";

/** Whether a token or key still authenticates into the role. */
const isHeld = (role: RoleResponse) =>
  role.token_count + role.tsig_key_count > 0;

const counted = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

/** "2 API tokens and 1 TSIG key", naming only the kinds present. */
const describeHolders = (role: RoleResponse) => {
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

export default function RoleList() {
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

  const query = searchQuery.trim().toLowerCase();
  const visibleRoles = rowSort.sorted(
    roles.filter((role) => role.name.toLowerCase().includes(query)),
  );

  return (
    <ListCard>
      <ListToolbar
        sort={
          <SortControl
            options={SORT_OPTIONS}
            sort={rowSort.sort}
            order={rowSort.order}
            onChange={rowSort.onChange}
          />
        }
      >
        <input
          type="text"
          aria-label="Search roles"
          placeholder="Search roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={LIST_FIELD_CLASS}
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
                className={`hidden @min-[37rem]/list:table-cell w-24 ${TABLE_HEADER_CLASS}`}
              >
                Grants
              </th>
              <th
                scope="col"
                className={`hidden @min-[37rem]/list:table-cell w-24 ${TABLE_HEADER_CLASS}`}
              >
                Tokens
              </th>
              <th
                scope="col"
                className={`hidden @min-[37rem]/list:table-cell w-32 whitespace-nowrap ${TABLE_HEADER_CLASS}`}
              >
                TSIG Keys
              </th>
              <th
                scope="col"
                className={`hidden @min-[54rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Description
              </th>
              <th
                scope="col"
                className={`hidden @min-[54rem]/list:table-cell w-44 ${TABLE_HEADER_CLASS}`}
              >
                Created
              </th>
              <th
                scope="col"
                className={`w-20 @min-[50rem]/list:w-24 text-right ${TABLE_HEADER_CLASS}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(!loading ? visibleRoles : []).map((role) => (
              <tr
                key={role.id}
                {...clickableRowProps(() => setSelectedRole(role))}
              >
                <td className={`${TABLE_CELL_CLASS} font-medium text-gray-900`}>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="min-w-0 truncate" title={role.name}>
                      {role.name}
                    </span>
                    {role.builtin && (
                      <BuiltinBadge title="The built-in role cannot be changed or deleted" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-normal text-gray-600 @min-[37rem]/list:hidden">
                    {counted(role.grant_count, "grant")} ·{" "}
                    {counted(role.token_count, "token")} ·{" "}
                    {counted(role.tsig_key_count, "key")}
                  </p>
                </td>
                <td
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} ${
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
                <td
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-700`}
                >
                  {role.token_count}
                </td>
                <td
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-700`}
                >
                  {role.tsig_key_count}
                </td>
                <td
                  className={`hidden @min-[54rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                  title={role.description ?? undefined}
                >
                  {role.description || "-"}
                </td>
                <td
                  className={`hidden @min-[54rem]/list:table-cell ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {formatDateTime(role.created_at)}
                </td>
                <td
                  className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-right`}
                >
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
          structured
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
        summary={
          error
            ? null
            : loading
              ? "Loading roles..."
              : describeCount(visibleRoles.length, "role", "roles")
        }
      />
    </ListCard>
  );
}
