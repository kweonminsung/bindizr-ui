import { useEffect, useState } from "react";
import { deleteTsigKey, getTsigKeys } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { TsigKeyResponse } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import TsigKeyDetails from "./TsigKeyDetails";
import { useToast } from "@/contexts/ToastContext";
import RoleFilterSelect from "./RoleFilterSelect";
import { SortValue } from "@/lib/sort";
import { useRowSort } from "@/lib/useRowSort";
import {
  describeCount,
  ListFooter,
  ListToolbar,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import SortControl from "./SortControl";

interface TsigKeyListProps {
  onCreateKey: () => void;
  /** Lists only this role's; its column is then left out. */
  roleName?: string;
  /** Shows a role filter that reports the pick here. */
  onRoleNameChange?: (roleName: string) => void;
  /** Called after a delete, for a parent showing counts. */
  onChange?: () => void;
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "algorithm", label: "Algorithm" },
  { value: "role_name", label: "Role" },
  { value: "created_at", label: "Created" },
] as const;

type TsigKeySortField = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: Record<
  TsigKeySortField,
  (tsigKey: TsigKeyResponse) => SortValue
> = {
  name: (tsigKey) => tsigKey.name,
  algorithm: (tsigKey) => tsigKey.algorithm,
  role_name: (tsigKey) => tsigKey.role_name,
  created_at: (tsigKey) => tsigKey.created_at,
};

export default function TsigKeyList({
  onCreateKey,
  roleName,
  onRoleNameChange,
  onChange,
}: TsigKeyListProps) {
  const toast = useToast();
  const { focusName, clearFocusName } = useFocusName();
  const [listing, setListing] = useState<{
    roleFilter: string;
    tsigKeys: TsigKeyResponse[];
  } | null>(null);
  const [selectedKey, setSelectedKey] = useState<TsigKeyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const rowSort = useRowSort(SORT_VALUES, "name");
  const [refreshKey, setRefreshKey] = useState(0);
  // Rows fetched under another role filter are never drawn under this one.
  const roleFilter = roleName ?? "";
  const tsigKeys = listing?.roleFilter === roleFilter ? listing.tsigKeys : null;

  useEffect(() => {
    let active = true;

    async function fetchTsigKeys() {
      setError(null);
      try {
        const data = await getTsigKeys(roleFilter);
        if (active) {
          setListing({ roleFilter, tsigKeys: data });
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch TSIG keys"));
        }
      }
    }

    fetchTsigKeys();

    return () => {
      active = false;
    };
  }, [refreshKey, roleFilter]);

  useEffect(() => {
    if (!focusName) {
      return;
    }
    const match = tsigKeys?.find((tsigKey) => tsigKey.name === focusName);
    if (match) {
      setSelectedKey(match);
    }
  }, [tsigKeys, focusName]);

  const handleCloseDetails = () => {
    setSelectedKey(null);
    clearFocusName();
  };

  const handleDelete = async (tsigKey: TsigKeyResponse) => {
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

  if (listing === null && !error) {
    return <p className="text-center text-gray-500">Loading TSIG keys...</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleKeys = rowSort.sorted(
    (tsigKeys ?? []).filter((tsigKey) =>
      tsigKey.name.toLowerCase().includes(query),
    ),
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
              onClick={onCreateKey}
              className="btn-primary w-full sm:w-auto"
            >
              Create TSIG Key
            </button>
          </>
        }
      >
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
      </ListToolbar>
      {/* Not an early return: a rejected role filter must stay correctable. */}
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
                className={`hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Algorithm
              </th>
              {!roleName && (
                <th scope="col" className={`w-40 ${TABLE_HEADER_CLASS}`}>
                  Role
                </th>
              )}
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
      <ListFooter
        summary={
          tsigKeys === null
            ? !error && "Loading TSIG keys..."
            : visibleKeys.length === 0 && roleName
              ? "No TSIG keys in this role"
              : describeCount(visibleKeys.length, "TSIG key", "TSIG keys")
        }
      />
    </div>
  );
}
