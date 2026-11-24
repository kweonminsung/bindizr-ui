import { useEffect, useState } from "react";
import { deleteDnssecPolicy, getDnssecPolicies } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { DnssecPolicyResponse } from "@/lib/types";
import DnssecPolicyDetails from "./DnssecPolicyDetails";
import BuiltinBadge from "./BuiltinBadge";
import Modal from "./Modal";
import Notice from "./Notice";
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

interface DnssecPolicyListProps {
  canManage: boolean;
}

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "algorithm", label: "Algorithm" },
  { value: "denial", label: "Denial" },
  { value: "created_at", label: "Created" },
] as const;

type DnssecPolicySortField = (typeof SORT_OPTIONS)[number]["value"];

const SORT_VALUES: Record<
  DnssecPolicySortField,
  (policy: DnssecPolicyResponse) => SortValue
> = {
  name: (policy) => policy.name,
  algorithm: (policy) => policy.algorithm,
  denial: (policy) => policy.denial,
  created_at: (policy) => policy.created_at,
};

export default function DnssecPolicyList({ canManage }: DnssecPolicyListProps) {
  // `dnssec:read` opens the page; policies change only with an all-zones manage.
  const toast = useToast();
  const [policies, setPolicies] = useState<DnssecPolicyResponse[]>([]);
  const [selectedPolicy, setSelectedPolicy] =
    useState<DnssecPolicyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const rowSort = useRowSort(SORT_VALUES, "name");

  useEffect(() => {
    let active = true;

    async function fetchPolicies() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDnssecPolicies();
        if (active) {
          setPolicies(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(
            getErrorMessage(fetchError, "Failed to fetch DNSSEC policies"),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPolicies();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const handleDelete = async (policy: DnssecPolicyResponse) => {
    if (!window.confirm(`Delete "${policy.name}"?`)) {
      return;
    }

    try {
      toast.success(await deleteDnssecPolicy(policy.name));
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      if (getErrorStatus(deleteError) === 409) {
        toast.error(
          `Zones still sign under "${policy.name}". Move them to another policy first.`,
        );
        return;
      }
      toast.error(
        getErrorMessage(deleteError, "Failed to delete DNSSEC policy"),
      );
    }
  };

  const handleUpdated = (updated: DnssecPolicyResponse) => {
    setSelectedPolicy(updated);
    setPolicies((prev) =>
      prev.map((policy) => (policy.id === updated.id ? updated : policy)),
    );
  };

  const query = searchQuery.trim().toLowerCase();
  const visiblePolicies = rowSort.sorted(
    policies.filter((policy) => policy.name.toLowerCase().includes(query)),
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
          aria-label="Search DNSSEC policies"
          placeholder="Search DNSSEC policies..."
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
                className={`hidden @min-[46rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Algorithm
              </th>
              <th
                scope="col"
                className={`w-20 @min-[50rem]/list:w-24 ${TABLE_HEADER_CLASS}`}
              >
                Denial
              </th>
              <th
                scope="col"
                className={`hidden @min-[46rem]/list:table-cell w-32 ${TABLE_HEADER_CLASS}`}
              >
                Key layout
              </th>
              <th
                scope="col"
                className={`hidden @min-[60rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Signatures
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
            {(!loading ? visiblePolicies : []).map((policy) => (
              <tr
                key={policy.id}
                {...clickableRowProps(() => setSelectedPolicy(policy))}
              >
                <td className={`${TABLE_CELL_CLASS} font-medium text-gray-900`}>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="min-w-0 truncate" title={policy.name}>
                      {policy.name}
                    </span>
                    {policy.builtin && (
                      <BuiltinBadge title="The default policy cannot be deleted" />
                    )}
                  </div>
                </td>
                <td
                  className={`hidden @min-[46rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {policy.algorithm}
                </td>
                <td
                  className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-gray-500 uppercase`}
                >
                  {policy.denial}
                </td>
                <td
                  className={`hidden @min-[46rem]/list:table-cell whitespace-nowrap ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {policy.key_layout === "split" ? "KSK/ZSK" : "CSK"}
                </td>
                <td
                  className={`hidden @min-[60rem]/list:table-cell truncate ${TABLE_CELL_CLASS} text-gray-500`}
                >
                  {policy.signature_validity_days}d valid, renew{" "}
                  {policy.signature_refresh_days}d before expiry
                </td>
                {canManage && (
                  <td
                    className={`whitespace-nowrap ${TABLE_CELL_CLASS} text-right`}
                  >
                    {!policy.builtin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(policy);
                        }}
                        className="font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedPolicy && (
        <Modal isOpen onClose={() => setSelectedPolicy(null)}>
          <DnssecPolicyDetails
            policy={selectedPolicy}
            onUpdated={handleUpdated}
          />
        </Modal>
      )}
      <ListFooter
        summary={
          error
            ? null
            : loading
              ? "Loading DNSSEC policies..."
              : describeCount(
                  visiblePolicies.length,
                  "DNSSEC policy",
                  "DNSSEC policies",
                )
        }
      />
    </ListCard>
  );
}
