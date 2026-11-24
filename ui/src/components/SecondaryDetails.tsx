import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { checkSecondary, updateSecondary } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import {
  SecondaryResponse,
  CheckSecondaryResponse,
  TransferSummaryResponse,
  UpdateSecondaryRequest,
} from "@/lib/types";
import Notice from "./Notice";
import { ModalContent } from "./Modal";
import NotifyTsigKeySelect from "./NotifyTsigKeySelect";
import TabBar from "./TabBar";
import { useBindizrToken } from "@/contexts/BindizrTokenContext";
import { useToast } from "@/contexts/ToastContext";

interface SecondaryDetailsProps {
  secondary: SecondaryResponse;
  onUpdated: (secondary: SecondaryResponse) => void;
}

const TABS = [
  { id: "settings", label: "Settings" },
  { id: "check", label: "Check" },
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
  const [notifyTsigKey, setNotifyTsigKey] = useState(
    secondary.notify_tsig_key_name ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [check, setCheck] = useState<CheckSecondaryResponse | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setAddress(secondary.address);
    setEnabled(secondary.enabled);
    setNotifyTsigKey(secondary.notify_tsig_key_name ?? "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateSecondaryRequest = {};
    if (address.trim() !== secondary.address) {
      payload.address = address.trim();
    }
    if (enabled !== secondary.enabled) {
      payload.enabled = enabled;
    }
    if (notifyTsigKey !== (secondary.notify_tsig_key_name ?? "")) {
      payload.notify_tsig_key_name = notifyTsigKey;
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
    <ModalContent
      scrollKey={activeTab}
      header={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800 sm:text-2xl">
              Secondary details
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
        </div>
      }
    >
      <div className="min-w-0 space-y-4">
        <p className="text-sm font-medium text-gray-700 wrap-anywhere">
          {secondary.name}
        </p>
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-base text-gray-900">
                {formatDateTime(secondary.created_at)}
              </p>
            </div>

            {allows("log:read") && (
              <p className="text-sm text-gray-500">
                The transfers Bindizr answered its addresses are in the{" "}
                <Link
                  to={`/logs/transfer?secondary_name=${encodeURIComponent(secondary.name)}`}
                  className="text-(--primary) hover:underline"
                >
                  transfer log
                </Link>
                .
              </p>
            )}

            {!canManage && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-base text-gray-900 font-mono wrap-anywhere">
                    {secondary.address}
                  </p>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-500">NOTIFY TSIG key</p>
                  <p className="text-base text-gray-900 wrap-anywhere">
                    {secondary.notify_tsig_key_name ?? "Unsigned"}
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
                    htmlFor="edit_notify_tsig_key"
                    className="block text-sm font-medium text-gray-600 mb-1"
                  >
                    NOTIFY TSIG key
                  </label>
                  <NotifyTsigKeySelect
                    id="edit_notify_tsig_key"
                    value={notifyTsigKey}
                    onChange={setNotifyTsigKey}
                  />
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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
      </div>
    </ModalContent>
  );
}

function CheckReport({ check }: { check: CheckSecondaryResponse }) {
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

/** How a secondary's zones were last served. */
function describeSummary(summary: TransferSummaryResponse): string {
  if (summary.zones === 0) return "no transfers";
  return `${summary.zones} zones: ${summary.ixfr_delta} IXFR delta, ${summary.ixfr_full} IXFR full, ${summary.axfr} AXFR, ${summary.refused} refused, ${summary.failed} failed`;
}
