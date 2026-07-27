import { useEffect, useState } from "react";
import { diffZoneSnapshots } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatRecordRdata } from "@/lib/recordValue";
import {
  RecordDiffChange,
  RecordDiffValue,
  SnapshotDiff,
  Zone,
} from "@/lib/types";

interface ZoneSnapshotDiffProps {
  zone: Zone;
  from: number;
  /** Omitted compares against the current serial. */
  to?: number;
  onBack: () => void;
}

const CHANGE_STYLES: Record<RecordDiffChange, string> = {
  added: "bg-green-50 border-green-200",
  removed: "bg-red-50 border-red-200",
  changed: "bg-amber-50 border-amber-200",
};

const CHANGE_SIGNS: Record<RecordDiffChange, string> = {
  added: "+",
  removed: "−",
  changed: "~",
};

const CHANGE_SIGN_STYLES: Record<RecordDiffChange, string> = {
  added: "text-green-700",
  removed: "text-red-700",
  changed: "text-amber-700",
};

const formatRdata = (values: RecordDiffValue[]) =>
  values.map(formatRecordRdata).join(", ");

/** An RRset shares one TTL, so the first one set stands for the whole side. */
const sideTtl = (values: RecordDiffValue[]) =>
  values.find((value) => value.ttl != null)?.ttl ?? null;

export default function ZoneSnapshotDiff({
  zone,
  from,
  to,
  onBack,
}: ZoneSnapshotDiffProps) {
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchDiff() {
      setLoading(true);
      setError(null);
      try {
        const data = await diffZoneSnapshots(zone.name, from, to);
        if (active) {
          setDiff(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to diff snapshots"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDiff();

    return () => {
      active = false;
    };
  }, [zone.name, from, to]);

  // The response resolves an omitted `to` to the current serial.
  const fromSerial = diff?.from_serial ?? from;
  const toSerial = diff?.to_serial ?? to;
  const recordDiff = diff?.diff ?? null;

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to history
        </button>
        <h3 className="text-xl font-bold text-gray-800 mt-2">
          Serial {fromSerial} → {toSerial ?? "current"}
        </h3>
        {recordDiff && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
              +{recordDiff.summary.added} added
            </span>
            <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
              −{recordDiff.summary.removed} removed
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              ~{recordDiff.summary.changed} changed
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">Computing diff...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : !recordDiff || recordDiff.entries.length === 0 ? (
        <p className="text-gray-500">
          No record differences between these serials.
        </p>
      ) : (
        <ul className="space-y-1">
          {recordDiff.entries.map((entry, index) => {
            const ttl =
              entry.change === "removed"
                ? sideTtl(entry.from)
                : sideTtl(entry.to);

            return (
              <li
                key={`${entry.name}-${entry.record_type}-${index}`}
                className={`flex items-baseline gap-2 rounded-md border px-2 py-1 text-sm ${CHANGE_STYLES[entry.change]}`}
              >
                <span
                  className={`font-mono font-bold ${CHANGE_SIGN_STYLES[entry.change]}`}
                >
                  {CHANGE_SIGNS[entry.change]}
                </span>
                <span className="font-medium text-gray-900 break-all">
                  {entry.name}
                </span>
                <span className="text-gray-500">{entry.record_type}</span>
                {ttl != null && (
                  <span className="text-gray-400">TTL {ttl}</span>
                )}
                <span className="min-w-0 flex-1 text-right font-mono break-all">
                  {entry.change !== "added" && (
                    <span className="text-red-700">
                      {formatRdata(entry.from)}
                    </span>
                  )}
                  {entry.change === "changed" && (
                    <span className="text-gray-400"> → </span>
                  )}
                  {entry.change !== "removed" && (
                    <span className="text-green-700">
                      {formatRdata(entry.to)}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
