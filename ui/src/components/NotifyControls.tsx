import { useEffect, useState } from "react";
import { getZones, notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";

export default function NotifyControls() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneName, setSelectedZoneName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);

  useEffect(() => {
    async function fetchZones() {
      try {
        setZones(await getZones());
      } catch (error) {
        setMessage(getErrorMessage(error, "Failed to fetch zones"));
      } finally {
        setLoadingZones(false);
      }
    }

    fetchZones();
  }, []);

  const handleNotify = async (zoneName?: string | null) => {
    setLoading(true);
    setMessage(null);
    try {
      setMessage(await notifyZones(zoneName));
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to send DNS NOTIFY"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-(--primary) mb-4">DNS NOTIFY</h2>
      <div className="rounded-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
          <select
            value={selectedZoneName}
            onChange={(e) => setSelectedZoneName(e.target.value)}
            disabled={loading || loadingZones}
            aria-label="DNS NOTIFY zone"
            className="w-full sm:w-72 rounded"
          >
            <option value="">All zones</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.name}>
                {zone.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => handleNotify(selectedZoneName || null)}
            disabled={loading || loadingZones}
            className="btn-primary"
          >
            {loading ? "Sending..." : "Send NOTIFY"}
          </button>
        </div>
        <div className="mt-6">
          <pre className="p-4 bg-white rounded-md whitespace-pre-wrap">
            {message ?? "Response will appear here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
