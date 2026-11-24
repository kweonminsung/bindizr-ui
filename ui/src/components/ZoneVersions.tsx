import { useEffect, useState } from "react";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { getZoneVersion, getZoneVersionsPage, rollbackZone } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { formatRecordValue } from "@/lib/recordValue";
import {
  RollbackZoneResponse,
  GetZoneVersionResponse,
  ZoneResponse,
  ZoneVersionResponse,
  ZoneVersionListQuery,
} from "@/lib/types";
import ChangeSourceBadge, { describeActor } from "./ChangeSourceBadge";
import Notice from "./Notice";
import PaginationControls from "./PaginationControls";
import ZoneVersionDiff from "./ZoneVersionDiff";
import { useToast } from "@/contexts/ToastContext";
import {
  ListFooter,
  PageSummary,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";

interface ZoneVersionsProps {
  zone: ZoneResponse;
  onRolledBack: (result: RollbackZoneResponse) => void;
}

export default function ZoneVersions({
  zone,
  onRolledBack,
}: ZoneVersionsProps) {
  const toast = useToast();
  const { allows, allowsWholeZone } = useBindizrToken();
  // Listing needs zone:read; versions, diffs and rollback read the zone whole.
  const canReadVersions = allowsWholeZone("record:read", zone.name);
  const canRollBack =
    allows("zone:update", zone.name) &&
    canReadVersions &&
    allowsWholeZone("record:create", zone.name) &&
    allowsWholeZone("record:delete", zone.name);
  const [listing, setListing] = useState<{
    request: string;
    versions: ZoneVersionResponse[];
    total: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [includeSignerOnlyVersions, setIncludeSignerOnlyVersions] =
    useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Rows fetched for another page or view are never drawn under this one.
  const request = JSON.stringify([
    zone.name,
    {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      include_signer_only_versions: includeSignerOnlyVersions,
    } satisfies ZoneVersionListQuery,
  ]);
  const versions = listing?.request === request ? listing.versions : null;
  const total = listing?.total ?? 0;

  const [detail, setDetail] = useState<GetZoneVersionResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [diffFrom, setDiffFrom] = useState<number | null>(null);

  const [preview, setPreview] = useState<RollbackZoneResponse | null>(null);
  const [rollbackPending, setRollbackPending] = useState(false);
  const [rollbackResult, setRollbackResult] =
    useState<RollbackZoneResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchVersions() {
      setError(null);
      try {
        const [zoneName, query]: [string, ZoneVersionListQuery] =
          JSON.parse(request);
        const data = await getZoneVersionsPage(zoneName, query);
        if (active) {
          setListing({
            request,
            versions: data.items,
            total: data.pagination.total,
          });
        }
      } catch (fetchError) {
        if (active) {
          setError(getErrorMessage(fetchError, "Failed to fetch versions"));
        }
      }
    }

    fetchVersions();

    return () => {
      active = false;
    };
  }, [refreshKey, request]);

  const handleSelect = async (serial: number) => {
    setDetailLoading(true);
    setPreview(null);
    setRollbackResult(null);
    try {
      setDetail(await getZoneVersion(zone.name, serial));
    } catch (fetchError) {
      toast.error(getErrorMessage(fetchError, "Failed to fetch version"));
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
      setPreview(await rollbackZone(zone.name, serial, true));
    } catch (rollbackError) {
      toast.error(getErrorMessage(rollbackError, "Failed to preview rollback"));
    } finally {
      setRollbackPending(false);
    }
  };

  const handleApplyRollback = async (serial: number) => {
    setRollbackPending(true);
    try {
      const result = await rollbackZone(zone.name, serial, false);
      setPreview(null);
      setRollbackResult(result);
      toast.success(
        `Rolled back to serial ${result.target_serial}. The zone is now at serial ${result.new_serial} (${renderSummary(result)}).`,
      );
      setRefreshKey((prev) => prev + 1);
      onRolledBack(result);
    } catch (rollbackError) {
      toast.error(getErrorMessage(rollbackError, "Failed to roll back zone"));
    } finally {
      setRollbackPending(false);
    }
  };

  const renderSummary = (result: RollbackZoneResponse) =>
    `${result.summary.added} added, ${result.summary.deleted} deleted, ${result.summary.unchanged} unchanged, SOA ${
      result.summary.soa_changed ? "changed" : "unchanged"
    }`;

  if (diffFrom !== null) {
    return (
      <ZoneVersionDiff
        zone={zone}
        from={diffFrom}
        onBack={() => setDiffFrom(null)}
      />
    );
  }

  if (detail) {
    const { version, records } = detail;

    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to history
          </button>
          <h3 className="text-xl font-bold text-gray-800 mt-2">
            Serial {version.serial}
          </h3>
          <p className="text-sm text-gray-500">
            {formatDateTime(version.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200 col-span-2">
            <p className="text-sm text-gray-500">Primary NS</p>
            <p className="text-gray-900 break-all">{version.mname}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200 col-span-2">
            <p className="text-sm text-gray-500">Admin Email</p>
            <p className="text-gray-900 break-all">{version.rname}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Default TTL</p>
            <p className="text-gray-900">{version.default_ttl}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Refresh</p>
            <p className="text-gray-900">{version.refresh}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Retry</p>
            <p className="text-gray-900">{version.retry}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Expire</p>
            <p className="text-gray-900">{version.expire}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Minimum TTL</p>
            <p className="text-gray-900">{version.minimum_ttl}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-2">
            Records at this serial ({records.length})
          </h3>
          <div className="@container/list overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th scope="col" className={TABLE_HEADER_CLASS}>
                    Name
                  </th>
                  <th
                    scope="col"
                    className={`hidden w-20 @min-[34rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                  >
                    Type
                  </th>
                  <th scope="col" className={TABLE_HEADER_CLASS}>
                    Value
                  </th>
                  <th
                    scope="col"
                    className={`hidden w-20 @min-[34rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                  >
                    TTL
                  </th>
                  <th
                    scope="col"
                    className={`hidden w-24 @min-[34rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                  >
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr key={`${record.name}-${record.type}-${index}`}>
                    <td
                      className={`${TABLE_CELL_CLASS} align-top text-gray-900 wrap-anywhere`}
                    >
                      <p>{record.name}</p>
                      <div className="mt-1 space-y-1 text-xs text-gray-500 @min-[34rem]/list:hidden">
                        <p>{record.type}</p>
                        <p>TTL {record.ttl}</p>
                        {record.priority != null && (
                          <p>Priority {record.priority}</p>
                        )}
                      </div>
                    </td>
                    <td
                      className={`hidden @min-[34rem]/list:table-cell ${TABLE_CELL_CLASS} align-top text-gray-500`}
                    >
                      {record.type}
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} align-top whitespace-pre-wrap text-gray-500 wrap-anywhere`}
                    >
                      {formatRecordValue(record.value, record.type)}
                    </td>
                    <td
                      className={`hidden @min-[34rem]/list:table-cell ${TABLE_CELL_CLASS} align-top text-gray-500`}
                    >
                      {record.ttl}
                    </td>
                    <td
                      className={`hidden @min-[34rem]/list:table-cell ${TABLE_CELL_CLASS} align-top text-gray-500`}
                    >
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
          <Notice
            tone="warning"
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="space-y-1">
              <p className="font-medium">
                Rolling back to serial {preview.target_serial} will apply:{" "}
                {renderSummary(preview)}.
              </p>
              <p>
                The zone serial advances to {preview.new_serial} — serials never
                go backward. A single NOTIFY is sent.
              </p>
            </div>
            <div className="flex shrink-0 space-x-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="btn-secondary whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApplyRollback(preview.target_serial)}
                disabled={rollbackPending}
                className="btn-primary whitespace-nowrap"
              >
                {rollbackPending ? "Applying..." : "Apply Rollback"}
              </button>
            </div>
          </Notice>
        )}

        {canRollBack && !preview && !rollbackResult && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handlePreviewRollback(version.serial)}
              disabled={rollbackPending || version.serial === zone.serial}
              title={
                version.serial === zone.serial
                  ? "This is the current serial"
                  : undefined
              }
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Version History
          </h3>
          <p className="text-sm text-gray-500">Current serial: {zone.serial}</p>
        </div>
        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={includeSignerOnlyVersions}
            onChange={(e) => {
              setIncludeSignerOnlyVersions(e.target.checked);
              setPage(1);
            }}
          />
          <span>Include signer-only versions</span>
        </label>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      <div className="@container/list rounded-md border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th scope="col" className={TABLE_HEADER_CLASS}>
                  Serial
                </th>
                <th
                  scope="col"
                  className={`hidden w-40 @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                >
                  Created
                </th>
                <th
                  scope="col"
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                >
                  Changed By
                </th>
                <th
                  scope="col"
                  className={`hidden @min-[37rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                >
                  Primary NS
                </th>
                {canReadVersions && (
                  <th
                    scope="col"
                    className={`w-24 text-right ${TABLE_HEADER_CLASS}`}
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(error ? [] : (versions ?? [])).map((version) => {
                const timestamp = (
                  <time dateTime={version.created_at}>
                    {formatDateTime(version.created_at)}
                  </time>
                );
                const actor = (
                  <span className="wrap-anywhere">
                    {version.actor ? describeActor(version.actor) : "—"}
                    <ChangeSourceBadge
                      source={version.source}
                      className="ml-1"
                    />
                  </span>
                );
                return (
                  <tr
                    key={version.serial}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td
                      className={`${TABLE_CELL_CLASS} align-top font-medium text-gray-900`}
                    >
                      <span>{version.serial}</span>
                      {version.serial === zone.serial && (
                        <span className="ml-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Current
                        </span>
                      )}
                      <div className="mt-1 space-y-1 text-xs font-normal text-gray-500 @min-[37rem]/list:hidden">
                        {timestamp}
                        <p>{actor}</p>
                        <p className="wrap-anywhere">{version.mname}</p>
                      </div>
                    </td>
                    <td
                      className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} align-top text-gray-500`}
                    >
                      {timestamp}
                    </td>
                    <td
                      className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} align-top text-gray-500`}
                    >
                      {actor}
                    </td>
                    <td
                      className={`hidden @min-[37rem]/list:table-cell ${TABLE_CELL_CLASS} align-top text-gray-500 wrap-anywhere`}
                    >
                      {version.mname}
                    </td>
                    {canReadVersions && (
                      <td
                        className={`${TABLE_CELL_CLASS} whitespace-nowrap text-right`}
                      >
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDiffFrom(version.serial)}
                            disabled={version.serial === zone.serial}
                            title={
                              version.serial === zone.serial
                                ? "This is the current serial"
                                : "Diff against the current serial"
                            }
                            className="font-medium text-indigo-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                          >
                            Diff
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelect(version.serial)}
                            disabled={detailLoading}
                            className="font-medium text-green-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                          >
                            {detailLoading ? "Loading..." : "Inspect"}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ListFooter
          summary={
            error ? null : versions === null ? (
              "Loading versions..."
            ) : versions.length > 0 ? (
              <PageSummary
                offset={(page - 1) * pageSize}
                count={versions.length}
                total={total}
              />
            ) : (
              "No versions for this zone yet."
            )
          }
        >
          <PaginationControls
            currentPage={page}
            pageSize={pageSize}
            totalItems={total}
            disabled={versions === null || error !== null}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
          />
        </ListFooter>
      </div>
    </div>
  );
}
