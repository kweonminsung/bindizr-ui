import { useState } from "react";
import { getZone, notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";
import ZoneStatusPanel from "./ZoneStatusPanel";

interface ZoneSyncTabProps {
  zone: Zone;
  /** A bumped serial must reach the Zone and History tabs, which compare against it. */
  onZoneChanged?: (zone: Zone) => void;
}

interface NotifyResult {
  text: string;
  failed: boolean;
}

export default function ZoneSyncTab({ zone, onZoneChanged }: ZoneSyncTabProps) {
  const [bumpSerial, setBumpSerial] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [result, setResult] = useState<NotifyResult | null>(null);
  // Re-probe the secondaries once a NOTIFY has gone out.
  const [statusToken, setStatusToken] = useState(0);

  const handleNotify = async () => {
    setNotifying(true);
    setResult(null);
    try {
      const message = await notifyZones(zone.name, bumpSerial);
      setResult({ text: message, failed: false });
      setStatusToken((prev) => prev + 1);
      if (bumpSerial && onZoneChanged) {
        // Best-effort: the NOTIFY already went out either way.
        try {
          onZoneChanged((await getZone(zone.name)).zone);
        } catch {
          /* the list refetches on close */
        }
      }
    } catch (error) {
      setResult({
        text: getErrorMessage(error, "Failed to send DNS NOTIFY"),
        failed: true,
      });
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
              checked={bumpSerial}
              onChange={(e) => setBumpSerial(e.target.checked)}
            />
            <span>
              Bump serial first (secondaries transfer even when nothing changed)
            </span>
          </label>
          <button
            type="button"
            onClick={handleNotify}
            disabled={notifying}
            className="btn-primary"
          >
            {notifying
              ? "Sending..."
              : bumpSerial
                ? "Bump & NOTIFY"
                : "Send NOTIFY"}
          </button>
        </div>
        {result && (
          <p
            className={`p-3 rounded-md border text-sm whitespace-pre-wrap ${
              result.failed
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-gray-50 text-gray-700"
            }`}
          >
            {result.text}
          </p>
        )}
      </div>
    </div>
  );
}
