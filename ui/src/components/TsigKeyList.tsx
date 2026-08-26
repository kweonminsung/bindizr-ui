import { useEffect, useState } from "react";
import { deleteTsigKey, getTsigKeys } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { TsigKey } from "@/lib/types";
import Modal from "./Modal";
import TsigKeyDetails from "./TsigKeyDetails";

interface TsigKeyListProps {
  onCreateKey: () => void;
}

export default function TsigKeyList({ onCreateKey }: TsigKeyListProps) {
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
        const data = await getTsigKeys();
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
  }, [refreshKey]);

  const handleDelete = async (tsigKey: TsigKey) => {
    if (!window.confirm(`Are you sure you want to delete "${tsigKey.name}"?`)) {
      return;
    }

    try {
      await deleteTsigKey(tsigKey.name);
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      if (getErrorStatus(deleteError) === 409) {
        alert(
          `"${tsigKey.name}" is still referenced by zone TSIG policies. Remove those policies first.`,
        );
        return;
      }
      alert(getErrorMessage(deleteError, "Failed to delete TSIG key"));
    }
  };

  if (loading && tsigKeys.length === 0) {
    return <p className="text-center text-gray-500">Loading TSIG keys...</p>;
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleKeys = query
    ? tsigKeys.filter((tsigKey) => tsigKey.name.toLowerCase().includes(query))
    : tsigKeys;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search TSIG keys..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto mb-4 sm:mb-0"
        />
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
              <th
                scope="col"
                className="w-36 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Scope
              </th>
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
                onClick={() => setSelectedKey(tsigKey)}
                className="cursor-pointer transition-colors hover:bg-gray-50"
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {tsigKey.name}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {tsigKey.algorithm}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {tsigKey.global ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      Global
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      Policy-based
                    </span>
                  )}
                </td>
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
        <Modal isOpen onClose={() => setSelectedKey(null)}>
          <TsigKeyDetails tsigKey={selectedKey} />
        </Modal>
      )}
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {visibleKeys.length > 0
            ? `${visibleKeys.length} TSIG key${visibleKeys.length > 1 ? "s" : ""}`
            : "No TSIG keys found"}
        </p>
      </div>
    </div>
  );
}
