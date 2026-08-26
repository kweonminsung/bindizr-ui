import { useEffect, useState } from "react";
import { getZones, notifyZones } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Zone } from "@/lib/types";
import ChevronDownIcon from "./icons/ChevronDownIcon";

type NotifyMode = "normal" | "bump_serial";

const NOTIFY_MODE_LABELS: Record<NotifyMode, string> = {
  normal: "Send NOTIFY",
  bump_serial: "Bump serial & NOTIFY",
};

interface NotifyResult {
  text: string;
  failed: boolean;
}

export default function NotifyControls() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneName, setSelectedZoneName] = useState("");
  const [notifyMode, setNotifyMode] = useState<NotifyMode>("normal");
  const [menuOpen, setMenuOpen] = useState(false);
  const [result, setResult] = useState<NotifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);

  useEffect(() => {
    async function fetchZones() {
      try {
        setZones(await getZones());
      } catch (error) {
        setResult({
          text: getErrorMessage(error, "Failed to fetch zones"),
          failed: true,
        });
      } finally {
        setLoadingZones(false);
      }
    }

    fetchZones();
  }, []);

  const handleNotify = async (zoneName?: string | null) => {
    setLoading(true);
    setResult(null);
    try {
      const message = await notifyZones(zoneName, notifyMode === "bump_serial");
      setResult({ text: message, failed: false });
    } catch (error) {
      setResult({
        text: getErrorMessage(error, "Failed to send DNS NOTIFY"),
        failed: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          DNS NOTIFY
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Prompt the secondaries of a zone — or of every zone — to pull the
          latest data.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <select
          value={selectedZoneName}
          onChange={(e) => setSelectedZoneName(e.target.value)}
          disabled={loading || loadingZones}
          aria-label="DNS NOTIFY zone"
          className="w-full sm:w-72 rounded"
        >
          <option value="">All Zones</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.name}>
              {zone.name}
            </option>
          ))}
        </select>
        <div
          className="relative inline-flex w-full sm:w-auto"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setMenuOpen(false);
            }
          }}
        >
          <button
            onClick={() => handleNotify(selectedZoneName || null)}
            disabled={loading || loadingZones}
            className="min-w-40 flex-1 rounded-l border-2 border-(--primary) bg-white px-3 py-1 text-sm font-semibold text-(--primary) transition-colors hover:bg-(--primary) hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-400 sm:flex-none"
          >
            {loading ? "Sending..." : NOTIFY_MODE_LABELS[notifyMode]}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={loading || loadingZones}
            aria-label="Choose DNS NOTIFY mode"
            aria-expanded={menuOpen}
            className="rounded-r border-2 border-l-0 border-(--primary) bg-white px-2 text-(--primary) transition-colors hover:bg-(--primary) hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              {(["normal", "bump_serial"] as NotifyMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setNotifyMode(mode);
                    setMenuOpen(false);
                  }}
                  className={`block w-full px-4 py-2 text-left text-sm ${
                    notifyMode === mode
                      ? "bg-gray-100 font-semibold text-(--primary)"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {NOTIFY_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {result && (
        <p
          className={`p-3 rounded-md border text-sm whitespace-pre-wrap ${
            result.failed
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
