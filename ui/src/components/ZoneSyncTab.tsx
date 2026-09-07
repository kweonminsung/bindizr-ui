import { useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getZone, notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";
import Notice from "./Notice";
import ZoneStatusPanel from "./ZoneStatusPanel";

interface ZoneSyncTabProps {
  zone: Zone;
  /** The Zone and History tabs compare against the serial a bump changes. */
  onZoneChanged?: (zone: Zone) => void;
}

interface NotifyResult {
  text: string;
  failed: boolean;
}

export default function ZoneSyncTab({ zone, onZoneChanged }: ZoneSyncTabProps) {
  // A scoped token may NOTIFY its zone but not bump the serial.
  const { globalAccess } = useBindizrToken();
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
          {globalAccess && (
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={bumpSerial}
                onChange={(e) => setBumpSerial(e.target.checked)}
              />
              <span>Bump serial first (forces a transfer)</span>
            </label>
          )}
          <button
            type="button"
            onClick={handleNotify}
            disabled={notifying}
            className="btn-primary sm:ml-auto"
          >
            {notifying
              ? "Sending..."
              : bumpSerial
                ? "Bump serial & NOTIFY"
                : "Send NOTIFY"}
          </button>
        </div>
        {result && (
          <Notice tone={result.failed ? "error" : "success"}>
            {result.text}
          </Notice>
        )}
      </div>
    </div>
  );
}
