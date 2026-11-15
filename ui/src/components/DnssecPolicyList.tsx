import { useEffect, useState } from "react";
import { deleteDnssecPolicy, getDnssecPolicies } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { DnssecPolicy } from "@/lib/types";
import DnssecPolicyDetails from "./DnssecPolicyDetails";
import BuiltinBadge from "./BuiltinBadge";
import Modal from "./Modal";
import Notice from "./Notice";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
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

interface DnssecPolicyListProps {
  onCreatePolicy: () => void;
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
  (policy: DnssecPolicy) => SortValue
> = {
  name: (policy) => policy.name,
  algorithm: (policy) => policy.algorithm,
  denial: (policy) => policy.denial,
  created_at: (policy) => policy.created_at,
};

export default function DnssecPolicyList({
  onCreatePolicy,
}: DnssecPolicyListProps) {
  const { allows } = useBindizrToken();
  // `dnssec:read` opens the page; policies change only with an all-zones manage.
  const canManage = allows("dnssec:manage");
  const toast = useToast();
  const [policies, setPolicies] = useState<DnssecPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<DnssecPolicy | null>(
    null,
  );
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

  const handleDelete = async (policy: DnssecPolicy) => {
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

  const handleUpdated = (updated: DnssecPolicy) => {
    setSelectedPolicy(updated);
    setPolicies((prev) =>
      prev.map((policy) => (policy.id === updated.id ? updated : policy)),
    );
  };

  if (loading && policies.length === 0 && !error) {
    return (
      <p className="text-center text-gray-500">Loading DNSSEC policies...</p>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visiblePolicies = rowSort.sorted(
    policies.filter((policy) => policy.name.toLowerCase().includes(query)),
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
                onClick={onCreatePolicy}
                className="btn-primary w-full sm:w-auto"
              >
                Create Policy
              </button>
            )}
          </>
        }
      >
        <input
          type="text"
          placeholder="Search DNSSEC policies..."
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
                className={`hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Algorithm
              </th>
              <th scope="col" className={`w-24 ${TABLE_HEADER_CLASS}`}>
                Denial
              </th>
              <th
                scope="col"
                className={`hidden md:table-cell w-32 ${TABLE_HEADER_CLASS}`}
              >
                Keys
              </th>
              <th
                scope="col"
                className={`hidden lg:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Signatures
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
            {visiblePolicies.map((policy) => (
              <tr
                key={policy.id}
                {...clickableRowProps(() => setSelectedPolicy(policy))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  <span className="inline-flex items-center gap-2">
                    {policy.name}
                    {policy.builtin && (
                      <BuiltinBadge title="The default policy cannot be deleted" />
                    )}
                  </span>
                </td>
                <td className="hidden md:table-cell truncate px-6 py-4 text-gray-500">
                  {policy.algorithm}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-gray-500 uppercase">
                  {policy.denial}
                </td>
                <td className="hidden md:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                  {policy.split_keys ? "KSK/ZSK" : "CSK"}
                </td>
                <td className="hidden lg:table-cell truncate px-6 py-4 text-gray-500">
                  {policy.signature_validity_days}d valid, renewed at{" "}
                  {policy.signature_refresh_days}d
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {canManage && !policy.builtin && (
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
        summary={describeCount(
          visiblePolicies.length,
          "DNSSEC policy",
          "DNSSEC policies",
        )}
      />
    </div>
  );
}
