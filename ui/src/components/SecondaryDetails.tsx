import { useEffect, useState } from "react";
import {
  checkSecondary,
  getSecondaryTransfers,
  getTsigKeys,
  updateSecondary,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import {
  Secondary,
  SecondaryCheck,
  SecondaryTransfers,
  Transfer,
  TransferSummary,
  TsigKey,
  UpdateSecondaryPayload,
} from "@/lib/types";
import Notice from "./Notice";
import TabBar from "./TabBar";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";

interface SecondaryDetailsProps {
  secondary: Secondary;
  onUpdated: (secondary: Secondary) => void;
}

const TABS = [
  { id: "settings", label: "Settings" },
  { id: "check", label: "Check" },
  { id: "transfers", label: "Transfers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SecondaryDetails({
  secondary,
  onUpdated,
}: SecondaryDetailsProps) {
  const toast = useToast();
  const { allows } = useBindizrToken();
  // Editing and checking (which sends a NOTIFY) need manage; read shows the rest.
  const canManage = allows("secondary:manage");
  const tabs = canManage ? TABS : TABS.filter((tab) => tab.id !== "check");
  const [activeTab, setActiveTab] = useState<TabId>("settings");
  const [address, setAddress] = useState(secondary.address);
  const [enabled, setEnabled] = useState(secondary.enabled);
  const [notifyKey, setNotifyKey] = useState(secondary.notify_key_name ?? "");
  const [tsigKeys, setTsigKeys] = useState<TsigKey[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [check, setCheck] = useState<SecondaryCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [transfers, setTransfers] = useState<SecondaryTransfers | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSecondaryTransfers(secondary.name)
      .then((served) => {
        if (!cancelled) setTransfers(served);
      })
      .catch((fetchError) =>
        toast.error(
          getErrorMessage(
            fetchError,
            "Failed to fetch the secondary's transfers",
          ),
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [secondary.name, toast]);

  useEffect(() => {
    setAddress(secondary.address);
    setEnabled(secondary.enabled);
    setNotifyKey(secondary.notify_key_name ?? "");
    setCheck(null);
    setActiveTab("settings");
  }, [secondary]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      setCheck(await checkSecondary(secondary.name));
    } catch (checkError) {
      toast.error(getErrorMessage(checkError, "Failed to check secondary"));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Only the edit form lists keys, and listing them needs access:manage.
    if (!canManage) {
      return;
    }
    let active = true;
    getTsigKeys()
      .then((keys) => {
        if (active) {
          setTsigKeys(keys);
        }
      })
      .catch((fetchError) => {
        if (active) {
          toast.error(getErrorMessage(fetchError, "Failed to fetch TSIG keys"));
        }
      });
    return () => {
      active = false;
    };
  }, [canManage, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateSecondaryPayload = {};
    if (address.trim() !== secondary.address) {
      payload.address = address.trim();
    }
    if (enabled !== secondary.enabled) {
      payload.enabled = enabled;
    }
    if (notifyKey !== (secondary.notify_key_name ?? "")) {
      payload.notify_key_name = notifyKey;
    }
    if (Object.keys(payload).length === 0) {
      toast.error("Nothing to change.");
      return;
    }

    setSubmitting(true);
    try {
      onUpdated(await updateSecondary(secondary.name, payload));
      toast.success("Secondary saved.");
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to update secondary"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800 break-all">
          {secondary.name}
        </h2>
        {secondary.enabled ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            Enabled
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Disabled
          </span>
        )}
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      <div className="max-h-[65vh] overflow-y-auto scrollbar-visible">
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Registered</p>
              <p className="text-base text-gray-900">
                {formatDateTime(secondary.created_at)}
              </p>
            </div>

            {!canManage && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-base text-gray-900 font-mono break-all">
                    {secondary.address}
                  </p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">NOTIFY Key</p>
                  <p className="text-base text-gray-900 break-all">
                    {secondary.notify_key_name ?? "Unsigned"}
                  </p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Enabled</p>
                  <p className="text-base text-gray-900">
                    {secondary.enabled ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            )}

            {canManage && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="edit_address"
                    className="block text-sm font-medium text-gray-600 mb-1"
                  >
                    Address
                  </label>
                  <input
                    type="text"
                    id="edit_address"
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="w-full font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">host[:port]</p>
                </div>
                <div>
                  <label
                    htmlFor="edit_notify_key"
                    className="block text-sm font-medium text-gray-600 mb-1"
                  >
                    NOTIFY Key
                  </label>
                  <select
                    id="edit_notify_key"
                    name="notify_key"
                    value={notifyKey}
                    onChange={(e) => setNotifyKey(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Send NOTIFY unsigned</option>
                    {tsigKeys.map((key) => (
                      <option key={key.id} value={key.name}>
                        {key.name}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-start space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Enabled
                    <span className="block text-gray-500">
                      Disabled: no NOTIFY, no unsigned transfer, no probe.
                    </span>
                  </span>
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-gray-500">
                    Takes effect on the next NOTIFY or transfer.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary whitespace-nowrap"
                  >
                    {submitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === "check" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Resolves the address, compares the catalog zone serial with
                Bindizr&apos;s, and sends a NOTIFY.
              </p>
              <button
                type="button"
                onClick={handleCheck}
                disabled={checking}
                className="btn-secondary whitespace-nowrap"
              >
                {checking ? "Checking..." : "Check now"}
              </button>
            </div>
            {check && <CheckReport check={check} />}
          </div>
        )}

        {activeTab === "transfers" &&
          (transfers ? (
            <TransfersReport transfers={transfers} />
          ) : (
            <p className="text-sm text-gray-500">Loading...</p>
          ))}
      </div>
    </div>
  );
}

function CheckReport({ check }: { check: SecondaryCheck }) {
  const catalog = check.catalog;
  const catalogLine =
    catalog.visible_serial == null
      ? `unreachable (${catalog.error ?? "unknown error"})`
      : catalog.status === "in_sync" || catalog.status === "reachable"
        ? `${catalog.status === "in_sync" ? "in sync" : "reachable"} at serial ${catalog.visible_serial}`
        : `${catalog.status} at serial ${catalog.visible_serial}, Bindizr serves ${check.catalog_serial}`;
  const healthy =
    !check.resolve_error &&
    catalog.status === "in_sync" &&
    check.notifies.every((notify) => notify.error == null);

  return (
    <Notice tone={healthy ? "success" : "warning"}>
      <ul className="space-y-1 text-sm">
        <li>
          {check.resolve_error
            ? `Resolution failed: ${check.resolve_error}`
            : `Resolves to ${check.addresses.join(", ")}`}
        </li>
        {check.listener_error && (
          <li>
            Bindizr&apos;s own listener did not answer: {check.listener_error}
          </li>
        )}
        <li>
          Catalog zone {check.catalog_zone_name}: {catalogLine}
        </li>
        {check.notifies.map((notify) => (
          <li key={notify.address}>
            NOTIFY to {notify.address}:{" "}
            {notify.error == null ? "accepted" : `rejected (${notify.error})`}
          </li>
        ))}
        <li>Transfers: {describeSummary(check.transfers)}</li>
      </ul>
    </Notice>
  );
}

/** What a transfer was: the kind and whether a delta, or that it was refused or failed. */
function describeTransfer(transfer: Transfer): string {
  if (transfer.result !== "ok") return transfer.result;
  if (transfer.kind === "ixfr")
    return transfer.incremental ? "IXFR delta" : "IXFR full";
  return "AXFR";
}

/** How a secondary's zones were last served. */
function describeSummary(summary: TransferSummary): string {
  if (summary.zones === 0) return "no transfers";
  return `${summary.zones} zones: ${summary.ixfr_delta} IXFR delta, ${summary.ixfr_full} IXFR full, ${summary.axfr} AXFR, ${summary.refused} refused, ${summary.failed} failed`;
}

function TransfersReport({ transfers }: { transfers: SecondaryTransfers }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        {describeSummary(transfers.summary)}
      </p>
      {transfers.transfers.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pr-3">Zone</th>
              <th className="pr-3">Transfer</th>
              <th className="pr-3">Serial</th>
              <th className="pr-3">Address</th>
              <th className="pr-3">At</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {transfers.transfers.map((transfer) => (
              <tr key={`${transfer.address}-${transfer.zone_name}`}>
                <td className="pr-3 font-mono">{transfer.zone_name}</td>
                <td className="pr-3">{describeTransfer(transfer)}</td>
                <td className="pr-3">{transfer.serial ?? "-"}</td>
                <td className="pr-3 font-mono">{transfer.address}</td>
                <td className="pr-3">{formatDateTime(transfer.at)}</td>
                <td>{transfer.error ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
