import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDnssecStatus, getZones } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { focusLink } from "@/lib/focusName";
import { DnssecStatus, Zone } from "@/lib/types";
import Notice from "./Notice";
import { KEY_STATE_STYLES } from "./ZoneDnssecTab";

/** Status probes per batch, so a large listing is not one burst. */
const PROBE_BATCH = 6;

/** A probe's outcome: the status, or why it could not be read. */
type Probe = { status: DnssecStatus } | { error: string };

/** Every signed zone with its signing state, read zone by zone. */
export default function DnssecOverview() {
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [probes, setProbes] = useState<Map<string, Probe>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      setError(null);
      let signed: Zone[];
      try {
        signed = await getZones({ signed: true });
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch signed zones"));
        }
        return;
      }
      if (!active) {
        return;
      }
      setZones(signed);

      for (let i = 0; i < signed.length; i += PROBE_BATCH) {
        if (!active) {
          return;
        }
        const batch = signed.slice(i, i + PROBE_BATCH);
        const results = await Promise.allSettled(
          batch.map((zone) => getDnssecStatus(zone.name)),
        );
        if (!active) {
          return;
        }
        setProbes((prev) => {
          const next = new Map(prev);
          results.forEach((result, index) => {
            next.set(
              batch[index].name,
              result.status === "fulfilled"
                ? { status: result.value }
                : {
                    error: getErrorMessage(
                      result.reason,
                      "Failed to read the status",
                    ),
                  },
            );
          });
          return next;
        });
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (zones === null && !error) {
    return <p className="text-center text-gray-500">Loading signed zones...</p>;
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleZones = (zones ?? []).filter((zone) =>
    zone.name.toLowerCase().includes(query),
  );

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <div className="p-4">
        <input
          type="text"
          placeholder="Search signed zones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-auto"
        />
      </div>
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
        </Notice>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Zone
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Policy
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Keys
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Signatures
              </th>
              <th
                scope="col"
                className="hidden lg:table-cell px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Next Re-sign
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {visibleZones.map((zone) => {
              const probe = probes.get(zone.name);
              const status = probe && "status" in probe ? probe.status : null;
              return (
                <tr key={zone.id}>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {zone.name}
                    {status?.withdrawing && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Withdrawing
                      </span>
                    )}
                    {status?.keys.some((key) => key.state === "published") && (
                      <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        Rolling
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {status?.policy?.name ?? (probe ? "-" : "…")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {probe && "error" in probe ? (
                      <span className="text-red-600" title={probe.error}>
                        unavailable
                      </span>
                    ) : status ? (
                      status.keys.map((key) => (
                        <span
                          key={key.id}
                          className={`mr-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase ${KEY_STATE_STYLES[key.state]}`}
                          title={`${key.state}, key tag ${key.key_tag}`}
                        >
                          {key.role}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">…</span>
                    )}
                  </td>
                  <td
                    className={`hidden md:table-cell whitespace-nowrap px-6 py-4 ${
                      status && status.expired_signatures > 0
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {status
                      ? status.expired_signatures > 0
                        ? `${status.signatures} (${status.expired_signatures} expired)`
                        : status.signatures
                      : "…"}
                  </td>
                  <td className="hidden lg:table-cell whitespace-nowrap px-6 py-4 text-gray-500">
                    {status?.next_resign_at
                      ? formatDateTime(status.next_resign_at)
                      : status
                        ? "-"
                        : "…"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      to={focusLink("/zones", zone.name, "dnssec")}
                      className="font-medium text-green-600 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-700">
          {zones === null
            ? !error && "Loading signed zones..."
            : visibleZones.length > 0
              ? `${visibleZones.length} signed zone${visibleZones.length > 1 ? "s" : ""}`
              : "No signed zones found"}
        </p>
      </div>
    </div>
  );
}
