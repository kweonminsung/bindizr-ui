import { useEffect, useState } from "react";
import { deleteTsigKey, getTsigKeys } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { TsigKey } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import TsigKeyDetails from "./TsigKeyDetails";
import { useToast } from "@/contexts/ToastContext";
import RoleFilterSelect from "./RoleFilterSelect";

interface TsigKeyListProps {
  onCreateKey: () => void;
  /** Lists only this role's; its column is then left out. */
  roleName?: string;
  /** Shows a role filter that reports the pick here. */
  onRoleNameChange?: (roleName: string) => void;
  /** Called after a delete, for a parent showing counts. */
  onChange?: () => void;
}

export default function TsigKeyList({
  onCreateKey,
  roleName,
  onRoleNameChange,
  onChange,
}: TsigKeyListProps) {
  const toast = useToast();
  const { focusName, clearFocusName } = useFocusName();
  const [tsigKeys, setTsigKeys] = useState<TsigKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<TsigKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchTsigKeys() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTsigKeys(roleName);
        if (active) {
          setTsigKeys(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch TSIG keys"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchTsigKeys();

    return () => {
      active = false;
    };
  }, [refreshKey, roleName]);

  useEffect(() => {
    if (!focusName) {
      return;
    }
    const match = tsigKeys.find((tsigKey) => tsigKey.name === focusName);
    if (match) {
      setSelectedKey(match);
    }
  }, [tsigKeys, focusName]);

  const handleCloseDetails = () => {
    setSelectedKey(null);
    clearFocusName();
  };

  const handleDelete = async (tsigKey: TsigKey) => {
    if (
      !window.confirm(
        `Delete "${tsigKey.name}"? nsupdate clients using it stop working.`,
      )
    ) {
      return;
    }

    try {
      toast.success(await deleteTsigKey(tsigKey.name));
      setRefreshKey((prev) => prev + 1);
      onChange?.();
    } catch (deleteError) {
      if (getErrorStatus(deleteError) === 409) {
        toast.error(
          `"${tsigKey.name}" still signs NOTIFY for a secondary. Move the secondary to another key first.`,
        );
        return;
      }
      toast.error(getErrorMessage(deleteError, "Failed to delete TSIG key"));
    }
  };

  if (loading && tsigKeys.length === 0) {
    return <p className="text-center text-gray-500">Loading TSIG keys...</p>;
  }
  if (error) {
    return <Notice tone="error">{error}</Notice>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleKeys = query
    ? tsigKeys.filter((tsigKey) => tsigKey.name.toLowerCase().includes(query))
    : tsigKeys;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:mb-0">
          <input
            type="text"
            placeholder="Search TSIG keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-auto"
          />
          {onRoleNameChange && (
            <RoleFilterSelect
              value={roleName ?? ""}
              onChange={onRoleNameChange}
            />
          )}
        </div>
        <button onClick={onCreateKey} className="btn-primary w-full sm:w-auto">
          Create TSIG Key
        </button>
      </div>
      <div className="overflow-x-auto">
        {/* Fixed layout: column widths must not follow the page content. */}
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Algorithm
              </th>
              {!roleName && (
                <th
                  scope="col"
                  className="w-40 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Role
                </th>
              )}
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="w-24 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleKeys.map((tsigKey) => (
              <tr
                key={tsigKey.id}
                {...clickableRowProps(() => setSelectedKey(tsigKey))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {tsigKey.name}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {tsigKey.algorithm}
                </td>
                {!roleName && (
                  <td className="truncate px-6 py-4 text-gray-700">
                    {tsigKey.role_name}
                  </td>
                )}
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {formatDateTime(tsigKey.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tsigKey);
                    }}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedKey && (
        <Modal isOpen wide onClose={handleCloseDetails}>
          <TsigKeyDetails tsigKey={selectedKey} />
        </Modal>
      )}
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {visibleKeys.length > 0
            ? `${visibleKeys.length} TSIG key${visibleKeys.length > 1 ? "s" : ""}`
            : roleName
              ? "No TSIG keys in this role"
              : "No TSIG keys found"}
        </p>
      </div>
    </div>
  );
}
