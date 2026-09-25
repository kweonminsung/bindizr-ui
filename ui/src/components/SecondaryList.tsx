import { useEffect, useState } from "react";
import { deleteSecondary, getSecondaries } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { Secondary } from "@/lib/types";
import Modal from "./Modal";
import Notice from "./Notice";
import SecondaryDetails from "./SecondaryDetails";
import { useToast } from "@/contexts/ToastContext";

interface SecondaryListProps {
  onCreateSecondary: () => void;
}

export default function SecondaryList({
  onCreateSecondary,
}: SecondaryListProps) {
  const toast = useToast();
  const { focusName, clearFocusName } = useFocusName();
  const [secondaries, setSecondaries] = useState<Secondary[]>([]);
  const [selected, setSelected] = useState<Secondary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchSecondaries() {
      setLoading(true);
      setError(null);
      try {
        const data = await getSecondaries();
        if (active) {
          setSecondaries(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch secondaries"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchSecondaries();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!focusName) {
      return;
    }
    const match = secondaries.find((secondary) => secondary.name === focusName);
    if (match) {
      setSelected(match);
    }
  }, [secondaries, focusName]);

  const handleCloseDetails = () => {
    setSelected(null);
    clearFocusName();
  };

  const handleUpdated = (updated: Secondary) => {
    setSecondaries((prev) =>
      prev.map((secondary) =>
        secondary.id === updated.id ? updated : secondary,
      ),
    );
    setSelected(updated);
  };

  const handleDelete = async (secondary: Secondary) => {
    if (
      !window.confirm(
        `Delete "${secondary.name}"? It stops receiving NOTIFY and its transfers are refused.`,
      )
    ) {
      return;
    }

    try {
      toast.success(await deleteSecondary(secondary.name));
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Failed to delete secondary"));
    }
  };

  if (loading && secondaries.length === 0) {
    return <p className="text-center text-gray-500">Loading secondaries...</p>;
  }
  if (error) {
    return <Notice tone="error">{error}</Notice>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visible = query
    ? secondaries.filter(
        (secondary) =>
          secondary.name.toLowerCase().includes(query) ||
          secondary.address.toLowerCase().includes(query),
      )
    : secondaries;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search secondaries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto mb-4 sm:mb-0"
        />
        <button
          onClick={onCreateSecondary}
          className="btn-primary w-full sm:w-auto"
        >
          Register Secondary
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
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Address
              </th>
              <th
                scope="col"
                className="w-32 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                State
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                NOTIFY Key
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
            {visible.map((secondary) => (
              <tr
                key={secondary.id}
                {...clickableRowProps(() => setSelected(secondary))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {secondary.name}
                </td>
                <td className="truncate px-6 py-4 font-mono text-gray-700">
                  {secondary.address}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  {secondary.enabled ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                      Enabled
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      Disabled
                    </span>
                  )}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {secondary.notify_key_name ?? "-"}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {formatDateTime(secondary.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(secondary);
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
      {selected && (
        <Modal isOpen onClose={handleCloseDetails}>
          <SecondaryDetails secondary={selected} onUpdated={handleUpdated} />
        </Modal>
      )}
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {visible.length > 0
            ? `${visible.length} secondar${visible.length > 1 ? "ies" : "y"}`
            : "No secondaries found"}
        </p>
      </div>
    </div>
  );
}
