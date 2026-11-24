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
import { useToast } from "@/contexts/ToastContext";
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
import Badge from "./Badge";

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
  canManage: boolean;
}

export default function SecondaryList({ canManage }: SecondaryListProps) {
  // `secondary:read` opens the page; changing a secondary needs manage.
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

  const query = searchQuery.trim().toLowerCase();
  const visible = rowSort.sorted(
    secondaries.filter(
      (secondary) =>
        secondary.name.toLowerCase().includes(query) ||
        secondary.address.toLowerCase().includes(query),
    ),
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
          aria-label="Search secondaries"
          placeholder="Search secondaries..."
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
                className={`hidden @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Address
              </th>
              <th
                scope="col"
                className={`hidden w-28 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                State
              </th>
              <th
                scope="col"
                className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                NOTIFY TSIG key
              </th>
              <th
                scope="col"
                className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Created
              </th>
              {canManage && (
                <th
                  scope="col"
                  className={`w-20 @min-[50rem]/list:w-24 text-right ${TABLE_HEADER_CLASS}`}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(!loading ? visible : []).map((secondary) => {
              const state = (
                <Badge tone={secondary.enabled ? "success" : "neutral"}>
                  {secondary.enabled ? "Enabled" : "Disabled"}
                </Badge>
              );
              return (
                <tr
                  key={secondary.id}
                  {...clickableRowProps(() => setSelected(secondary))}
                >
                  <td
                    className={`${TABLE_CELL_CLASS} font-medium text-gray-900`}
                  >
                    <p className="truncate" title={secondary.name}>
                      {secondary.name}
                    </p>
                    <div className="mt-1 space-y-1 @min-[37rem]/list:hidden">
                      <p
                        className="truncate font-mono text-xs font-normal text-gray-600"
                        title={secondary.address}
                      >
                        {secondary.address}
                      </p>
                      {state}
                    </div>
                  </td>
                  <td
                    className={`hidden @min-[37rem]/list:table-cell truncate ${TABLE_CELL_CLASS} font-mono text-gray-700`}
                    title={secondary.address}
                  >
                    {secondary.address}
                  </td>
                  <td
                    className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS}`}
                  >
                    {state}
                  </td>
                  <td
                    className={`hidden @min-[46rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                  >
                    {secondary.notify_tsig_key_name ?? "-"}
                  </td>
                  <td
                    className={`hidden @min-[46rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                  >
                    {formatDateTime(secondary.created_at)}
                  </td>
                  {canManage && (
                    <td
                      className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-right`}
                    >
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
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal
          isOpen
          wide
          structured
          onClose={handleCloseDetails}
          label="Secondary details"
        >
          <SecondaryDetails secondary={selected} onUpdated={handleUpdated} />
        </Modal>
      )}
      <ListFooter
        summary={
          error
            ? null
            : loading
              ? "Loading secondaries..."
              : describeCount(visible.length, "secondary", "secondaries")
        }
      />
    </ListCard>
  );
}
