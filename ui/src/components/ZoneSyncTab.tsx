import { useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getZone, notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ZoneResponse } from "@/lib/types";
import ZoneStatusPanel from "./ZoneStatusPanel";
import { useToast } from "@/contexts/ToastContext";

interface ZoneSyncTabProps {
  zone: ZoneResponse;
  onSerialChanged: (serial: number) => void;
}

export default function ZoneSyncTab({
  zone,
  onSerialChanged,
}: ZoneSyncTabProps) {
  const toast = useToast();
  // Sending a NOTIFY, with or without a serial bump, is `zone:update`.
  const { allows } = useBindizrToken();
  const [bumpSerial, setBumpSerial] = useState(false);
  const [notifying, setNotifying] = useState(false);
  // Re-probe the secondaries once a NOTIFY has gone out.
  const [statusToken, setStatusToken] = useState(0);

  const handleNotify = async () => {
    setNotifying(true);
    try {
      const message = await notifyZones(zone.name, bumpSerial);
      toast.success(message);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to send DNS NOTIFY"));
    } finally {
      setStatusToken((prev) => prev + 1);
      if (bumpSerial) {
        // A committed serial bump can outlive a failure to send NOTIFY.
        try {
          const refreshedZone = await getZone(zone.name);
          if (refreshedZone.id === zone.id) {
            onSerialChanged(refreshedZone.serial);
          }
        } catch {
          /* the list refetches on close */
        }
      }
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {allows("zone:read", zone.name) && (
        <ZoneStatusPanel zoneName={zone.name} refreshToken={statusToken} />
      )}

      {allows("zone:update", zone.name) && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
            DNS NOTIFY
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={bumpSerial}
                disabled={notifying}
                onChange={(e) => setBumpSerial(e.target.checked)}
              />
              <span>Bump the SOA serial before sending NOTIFY</span>
            </label>
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
        </div>
      )}
    </div>
  );
}
