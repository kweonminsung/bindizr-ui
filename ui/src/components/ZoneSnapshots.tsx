import { useEffect, useState } from "react";
import { getZoneSnapshot, getZoneSnapshotsPage, rollbackZone } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import {
  RollbackZoneResult,
  SnapshotDetail,
  Zone,
  ZoneSnapshot,
} from "@/lib/types";
import PaginationControls from "./PaginationControls";

interface ZoneSnapshotsProps {
  zone: Zone;
  onRolledBack: () => void;
}

export default function ZoneSnapshots({
  zone,
  onRolledBack,
}: ZoneSnapshotsProps) {
  const [snapshots, setSnapshots] = useState<ZoneSnapshot[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SnapshotDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [preview, setPreview] = useState<RollbackZoneResult | null>(null);
  const [rollbackPending, setRollbackPending] = useState(false);
  const [rollbackResult, setRollbackResult] =
    useState<RollbackZoneResult | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchSnapshots() {
      setLoading(true);
      setError(null);
      try {
        const data = await getZoneSnapshotsPage(zone.name, {
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        if (active) {
          setSnapshots(data.items);
          setTotal(data.pagination.total);
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch snapshots"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchSnapshots();

    return () => {
      active = false;
    };
  }, [zone.name, page, pageSize, refreshKey]);

  const handleSelect = async (serial: number) => {
    setDetailLoading(true);
    setPreview(null);
    setRollbackResult(null);
    try {
      setDetail(await getZoneSnapshot(zone.name, serial));
    } catch (fetchError) {
      alert(getErrorMessage(fetchError, "Failed to fetch snapshot"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBack = () => {
    setDetail(null);
    setPreview(null);
    setRollbackResult(null);
  };

  // A dry run first, so the destructive apply is always shown before it runs.
  const handlePreviewRollback = async (serial: number) => {
    setRollbackPending(true);
    setRollbackResult(null);
    try {
      setPreview(await rollbackZone(zone.name, { serial, dry_run: true }));
    } catch (rollbackError) {
      alert(getErrorMessage(rollbackError, "Failed to preview rollback"));
    } finally {
      setRollbackPending(false);
    }
  };

  const handleApplyRollback = async (serial: number) => {
    setRollbackPending(true);
    try {
      const result = await rollbackZone(zone.name, { serial, dry_run: false });
      setPreview(null);
      setRollbackResult(result);
      setRefreshKey((prev) => prev + 1);
      onRolledBack();
    } catch (rollbackError) {
      alert(getErrorMessage(rollbackError, "Failed to roll back zone"));
    } finally {
      setRollbackPending(false);
    }
  };

  const renderSummary = (result: RollbackZoneResult) =>
    `${result.summary.records_added} added, ${result.summary.records_deleted} deleted, ${result.summary.records_unchanged} unchanged, SOA ${
      result.summary.soa_changed ? "changed" : "unchanged"
    }`;

  if (detail) {
    const { snapshot, records } = detail;

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to history
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mt-2">
            Serial {snapshot.serial}
          </h2>
          <p className="text-sm text-gray-500">
            {formatDateTime(snapshot.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200 col-span-2">
            <p className="text-sm text-gray-500">Primary NS</p>
            <p className="text-gray-900 break-all">{snapshot.primary_ns}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200 col-span-2">
            <p className="text-sm text-gray-500">Admin Email</p>
            <p className="text-gray-900 break-all">{snapshot.admin_email}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">TTL</p>
            <p className="text-gray-900">{snapshot.ttl}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Refresh</p>
            <p className="text-gray-900">{snapshot.refresh}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Retry</p>
            <p className="text-gray-900">{snapshot.retry}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Expire</p>
            <p className="text-gray-900">{snapshot.expire}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Minimum TTL</p>
            <p className="text-gray-900">{snapshot.minimum_ttl}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-2">
            Records at this serial ({records.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    TTL
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr key={`${record.name}-${record.record_type}-${index}`}>
                    <td className="px-3 py-2 text-gray-900">{record.name}</td>
                    <td className="px-3 py-2 text-gray-500">
                      {record.record_type}
                    </td>
                    <td className="px-3 py-2 text-gray-500 break-all">
                      {record.value}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {record.ttl ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {record.priority ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && (
              <p className="p-3 text-sm text-gray-500">
                No records at this serial.
              </p>
            )}
          </div>
        </div>

        {preview && (
          <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-900 space-y-2">
            <p className="font-medium">
              Rolling back to serial {preview.target_serial} will apply:{" "}
              {renderSummary(preview)}.
            </p>
            <p>
              The zone serial advances to {preview.new_serial} — serials never
              go backward. A single NOTIFY is sent.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyRollback(preview.target_serial)}
                disabled={rollbackPending}
                className="btn-primary"
              >
                {rollbackPending ? "Applying..." : "Apply Rollback"}
              </button>
            </div>
          </div>
        )}

        {rollbackResult && (
          <div className="p-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-800">
            Rolled back to serial {rollbackResult.target_serial}. The zone is
            now at serial {rollbackResult.new_serial} ({" "}
            {renderSummary(rollbackResult)} ).
          </div>
        )}

        {!preview && !rollbackResult && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handlePreviewRollback(snapshot.serial)}
              disabled={rollbackPending}
              className="btn-primary"
            >
              {rollbackPending ? "Checking..." : "Roll Back to This Serial"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Snapshot History</h2>
        <p className="text-sm text-gray-500">
          Every mutation of <span className="font-medium">{zone.name}</span>
          {" records a snapshot. Current serial: "}
          {zone.serial ?? "-"}
        </p>
      </div>

      {loading && snapshots.length === 0 ? (
        <p className="text-gray-500">Loading snapshots...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : snapshots.length === 0 ? (
        <p className="text-gray-500">No snapshots for this zone yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Serial
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="hidden sm:table-cell px-3 py-2 text-xs font-medium text-gray-500 uppercase">
                  Primary NS
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.serial}
                  className="transition-colors hover:bg-gray-50"
                >
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {snapshot.serial}
                    {snapshot.serial === zone.serial && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        current
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {formatDateTime(snapshot.created_at)}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-2 text-gray-500 break-all">
                    {snapshot.primary_ns}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSelect(snapshot.serial)}
                      disabled={detailLoading}
                      className="font-medium text-green-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {detailLoading ? "Loading..." : "Inspect"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <PaginationControls
          currentPage={page}
          pageSize={pageSize}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
