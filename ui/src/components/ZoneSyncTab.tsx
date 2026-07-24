import { useState } from "react";
import { notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";
import ZoneStatusPanel from "./ZoneStatusPanel";

interface ZoneSyncTabProps {
  zone: Zone;
}

export default function ZoneSyncTab({ zone }: ZoneSyncTabProps) {
  const [force, setForce] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Re-probe the secondaries once a NOTIFY has gone out.
  const [statusToken, setStatusToken] = useState(0);

  const handleNotify = async () => {
    setNotifying(true);
    setMessage(null);
    try {
      setMessage(await notifyZones(zone.name, force));
      setStatusToken((prev) => prev + 1);
    } catch (error) {
      setMessage(getErrorMessage(error, "Failed to send DNS NOTIFY"));
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <ZoneStatusPanel zoneName={zone.name} refreshToken={statusToken} />

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          DNS NOTIFY
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
            />
            <span>Force (notify even when secondaries look in sync)</span>
          </label>
          <button
            type="button"
            onClick={handleNotify}
            disabled={notifying}
            className="btn-primary"
          >
            {notifying ? "Sending..." : force ? "Force NOTIFY" : "Send NOTIFY"}
          </button>
        </div>
        {message && (
          <p className="p-3 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
