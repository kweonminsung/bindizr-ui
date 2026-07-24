import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createZoneTsigPolicy,
  deleteZoneTsigPolicy,
  getTsigKeys,
  getZoneTsigPolicies,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { TsigKey, Zone, ZoneTsigPolicy } from "@/lib/types";

interface ZoneTsigPoliciesProps {
  zone: Zone;
}

const DEFAULT_PATTERN = "*";
const DEFAULT_TYPES = "*";

export default function ZoneTsigPolicies({ zone }: ZoneTsigPoliciesProps) {
  const [policies, setPolicies] = useState<ZoneTsigPolicy[]>([]);
  // Global keys already cover every zone and are rejected as policy targets.
  const [selectableKeys, setSelectableKeys] = useState<TsigKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tsigKeyName, setTsigKeyName] = useState("");
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [recordTypes, setRecordTypes] = useState(DEFAULT_TYPES);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchPolicies() {
      setLoading(true);
      setError(null);
      try {
        const [zonePolicies, tsigKeys] = await Promise.all([
          getZoneTsigPolicies(zone.name),
          getTsigKeys(),
        ]);
        if (active) {
          setPolicies(zonePolicies);
          setSelectableKeys(tsigKeys.filter((tsigKey) => !tsigKey.global));
        }
      } catch (fetchError) {
        if (active) {
          setError(
            getErrorMessage(fetchError, "Failed to fetch zone TSIG policies"),
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
  }, [zone.name, refreshKey]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      await createZoneTsigPolicy(zone.name, {
        tsig_key: tsigKeyName,
        record_name_pattern: pattern.trim() || DEFAULT_PATTERN,
        record_types: recordTypes.trim() || DEFAULT_TYPES,
      });
      setTsigKeyName("");
      setPattern(DEFAULT_PATTERN);
      setRecordTypes(DEFAULT_TYPES);
      setRefreshKey((prev) => prev + 1);
    } catch (createError) {
      alert(getErrorMessage(createError, "Failed to create zone TSIG policy"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (policy: ZoneTsigPolicy) => {
    if (
      !window.confirm(
        `Remove the policy granting "${policy.tsig_key}" updates on "${policy.record_name_pattern}"?`,
      )
    ) {
      return;
    }

    try {
      await deleteZoneTsigPolicy(zone.name, policy.id);
      setRefreshKey((prev) => prev + 1);
    } catch (deleteError) {
      alert(getErrorMessage(deleteError, "Failed to delete zone TSIG policy"));
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">TSIG Policies</h2>
        <p className="text-sm text-gray-500">
          Which keys may update which records of{" "}
          <span className="font-medium">{zone.name}</span> via nsupdate.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading policies...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : policies.length === 0 ? (
        <p className="text-gray-500">No TSIG policies for this zone yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {policies.map((policy) => (
            <li
              key={policy.id}
              className="flex items-start justify-between gap-4 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 break-all">
                  {policy.tsig_key}
                </p>
                <p className="text-sm text-gray-600 break-all">
                  <span className="font-mono">
                    {policy.record_name_pattern}
                  </span>{" "}
                  · <span className="font-mono">{policy.record_types}</span>
                </p>
                <p className="text-xs text-gray-400">
                  {formatDateTime(policy.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(policy)}
                className="shrink-0 text-sm font-medium text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Grant a Key
        </h3>
        {!loading && selectableKeys.length === 0 ? (
          <p className="text-sm text-gray-500">
            No policy-based TSIG keys available.{" "}
            <Link to="/tsig-keys" className="text-blue-600 hover:underline">
              Create one first
            </Link>
            .
          </p>
        ) : (
          <>
            <div>
              <label
                htmlFor="tsig_key"
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                TSIG Key
              </label>
              <select
                id="tsig_key"
                name="tsig_key"
                value={tsigKeyName}
                onChange={(e) => setTsigKeyName(e.target.value)}
                required
                className="w-full"
              >
                <option value="">Select a key</option>
                {selectableKeys.map((tsigKey) => (
                  <option key={tsigKey.id} value={tsigKey.name}>
                    {tsigKey.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="record_name_pattern"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Record Name Pattern
                </label>
                <input
                  type="text"
                  id="record_name_pattern"
                  name="record_name_pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="*"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <code>*</code> any name, <code>@</code> apex,{" "}
                  <code>*.sub</code> subtree, or an exact relative name.
                </p>
              </div>
              <div>
                <label
                  htmlFor="record_types"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Record Types
                </label>
                <input
                  type="text"
                  id="record_types"
                  name="record_types"
                  value={recordTypes}
                  onChange={(e) => setRecordTypes(e.target.value)}
                  placeholder="*"
                  className="w-full font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  <code>*</code> or a comma-separated list such as{" "}
                  <code>A,AAAA,TXT</code>.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "Adding..." : "Add Policy"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
