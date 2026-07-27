import { useEffect, useState } from "react";
import { getZoneStatus } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { SecondaryStatus, ZoneStatus } from "@/lib/types";

interface ZoneStatusPanelProps {
  zoneName: string;
  /** Bumped by the parent to re-probe, e.g. right after a NOTIFY. */
  refreshToken?: number;
}

const STATUS_STYLES: Record<SecondaryStatus, string> = {
  in_sync: "bg-green-100 text-green-700",
  lagging: "bg-amber-100 text-amber-800",
  ahead: "bg-blue-100 text-blue-700",
  unreachable: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<SecondaryStatus, string> = {
  in_sync: "In sync",
  lagging: "Lagging",
  ahead: "Ahead",
  unreachable: "Unreachable",
};

export default function ZoneStatusPanel({
  zoneName,
  refreshToken = 0,
}: ZoneStatusPanelProps) {
  const [status, setStatus] = useState<ZoneStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      setLoading(true);
      setError(null);
      try {
        const data = await getZoneStatus(zoneName);
        if (active) {
          setStatus(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch zone status"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchStatus();

    return () => {
      active = false;
    };
  }, [zoneName, refreshKey, refreshToken]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <h3 className="text-lg font-semibold text-gray-700">
          Secondary Status
        </h3>
        <button
          type="button"
          onClick={() => setRefreshKey((prev) => prev + 1)}
          disabled={loading}
          className="text-sm font-medium text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline"
        >
          {loading ? "Probing..." : "Refresh"}
        </button>
      </div>

      {loading && !status ? (
        <p className="text-sm text-gray-500">
          Querying every secondary for its SOA serial...
        </p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : !status || status.secondaries.length === 0 ? (
        <p className="text-sm text-gray-500">No secondaries configured.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {status.secondaries.map((secondary) => (
            <li
              key={secondary.address}
              className="flex items-start justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 break-all">
                  {secondary.address}
                </p>
                <p className="text-sm text-gray-500">
                  serial {secondary.visible_serial ?? "-"} / {status.serial}
                </p>
                {secondary.error && (
                  <p className="text-sm text-red-600 break-all">
                    {secondary.error}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  STATUS_STYLES[secondary.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {STATUS_LABELS[secondary.status] ?? secondary.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
