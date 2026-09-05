import { useEffect, useState } from "react";
import { deleteDnssecPolicy, getDnssecPolicies } from "@/lib/api";
import { clickableRowProps } from "@/lib/clickableRow";
import { getErrorMessage, getErrorStatus } from "@/lib/errors";
import { DEFAULT_DNSSEC_POLICY_NAME, DnssecPolicy } from "@/lib/types";
import DnssecPolicyDetails from "./DnssecPolicyDetails";
import Modal from "./Modal";

interface DnssecPolicyListProps {
  onCreatePolicy: () => void;
}

export default function DnssecPolicyList({
  onCreatePolicy,
}: DnssecPolicyListProps) {
  const [policies, setPolicies] = useState<DnssecPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<DnssecPolicy | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
      await deleteDnssecPolicy(policy.name);
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      if (getErrorStatus(deleteError) === 409) {
        alert(
          `Zones still sign under "${policy.name}". Move them to another policy first.`,
        );
        return;
      }
      alert(getErrorMessage(deleteError, "Failed to delete DNSSEC policy"));
    }
  };

  const handleUpdated = (updated: DnssecPolicy) => {
    setSelectedPolicy(updated);
    setPolicies((prev) =>
      prev.map((policy) => (policy.id === updated.id ? updated : policy)),
    );
  };

  if (loading && policies.length === 0) {
    return (
      <p className="text-center text-gray-500">Loading DNSSEC policies...</p>
    );
  }
  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visiblePolicies = query
    ? policies.filter((policy) => policy.name.toLowerCase().includes(query))
    : policies;

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search DNSSEC policies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto mb-4 sm:mb-0"
        />
        <button
          onClick={onCreatePolicy}
          className="btn-primary w-full sm:w-auto"
        >
          Create Policy
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
                className="w-24 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Denial
              </th>
              <th
                scope="col"
                className="hidden md:table-cell w-32 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Keys
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Signatures
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
            {visiblePolicies.map((policy) => (
              <tr
                key={policy.id}
                {...clickableRowProps(() => setSelectedPolicy(policy))}
              >
                <td className="truncate px-6 py-4 font-medium text-gray-900">
                  {policy.name}
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
                  {policy.name === DEFAULT_DNSSEC_POLICY_NAME ? (
                    <span
                      className="text-gray-400"
                      title="The built-in default policy cannot be deleted"
                    >
                      Built-in
                    </span>
                  ) : (
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
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {visiblePolicies.length > 0
            ? `${visiblePolicies.length} DNSSEC polic${visiblePolicies.length > 1 ? "ies" : "y"}`
            : "No DNSSEC policies found"}
        </p>
      </div>
    </div>
  );
}
