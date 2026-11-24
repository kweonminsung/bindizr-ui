import { useEffect, useState } from "react";
import { deleteSecondary, getSecondaries } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { useFocusName } from "@/lib/focusName";
import { SortValue } from "@/lib/sort";
import { SecondaryResponse } from "@/lib/types";
import { useRowSort } from "@/lib/useRowSort";
import Modal from "./Modal";
import Notice from "./Notice";
import SecondaryDetails from "./SecondaryDetails";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";
import {
  describeCount,
  ListFooter,
  ListToolbar,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import SortControl from "./SortControl";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "address", label: "Address" },
  { value: "enabled", label: "State" },
  { value: "created_at", label: "Created" },
] as const;

type SecondarySortField = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: Record<
  SecondarySortField,
  (secondary: SecondaryResponse) => SortValue
> = {
  name: (secondary) => secondary.name,
  address: (secondary) => secondary.address,
  enabled: (secondary) => secondary.enabled,
  created_at: (secondary) => secondary.created_at,
};

interface SecondaryListProps {
  onCreateSecondary: () => void;
}

export default function SecondaryList({
  onCreateSecondary,
}: SecondaryListProps) {
  const { allows } = useBindizrToken();
  // `secondary:read` opens the page; changing a secondary needs manage.
  const canManage = allows("secondary:manage");
  const toast = useToast();
  const { focusName, clearFocusName } = useFocusName();
  const [secondaries, setSecondaries] = useState<SecondaryResponse[]>([]);
  const [selected, setSelected] = useState<SecondaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const rowSort = useRowSort(SORT_VALUES, "name");

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

  const handleUpdated = (updated: SecondaryResponse) => {
    setSecondaries((prev) =>
      prev.map((secondary) =>
        secondary.id === updated.id ? updated : secondary,
      ),
    );
    setSelected(updated);
  };

  const handleDelete = async (secondary: SecondaryResponse) => {
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

  if (loading && secondaries.length === 0 && !error) {
    return <p className="text-center text-gray-500">Loading secondaries...</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visible = rowSort.sorted(
    secondaries.filter(
      (secondary) =>
        secondary.name.toLowerCase().includes(query) ||
        secondary.address.toLowerCase().includes(query),
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
            {canManage && (
              <button
                onClick={onCreateSecondary}
                className="btn-primary w-full sm:w-auto"
              >
                Register Secondary
              </button>
            )}
          </>
        }
      >
        <input
          type="text"
          placeholder="Search secondaries..."
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
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Address
              </th>
              <th scope="col" className={`w-32 ${TABLE_HEADER_CLASS}`}>
                State
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                NOTIFY TSIG key
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
                  {secondary.notify_tsig_key_name ?? "-"}
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {formatDateTime(secondary.created_at)}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {canManage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(secondary);
                      }}
                      className="font-medium text-red-600 hover:underline"
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
      {selected && (
        <Modal isOpen wide onClose={handleCloseDetails}>
          <SecondaryDetails secondary={selected} onUpdated={handleUpdated} />
        </Modal>
      )}
      <ListFooter
        summary={describeCount(visible.length, "secondary", "secondaries")}
      />
    </div>
  );
}
