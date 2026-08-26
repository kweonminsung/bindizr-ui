import { useEffect, useState } from "react";
import {
  confirmDnssecDsSeen,
  disableDnssec,
  enableDnssec,
  getDnssecStatus,
  signDnssecZone,
  startDnssecRollover,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import {
  DNSSEC_ALGORITHMS,
  DNSSEC_DENIAL_MODES,
  DnssecAlgorithm,
  DnssecDenialMode,
  DnssecKeyState,
  DnssecRolloverRole,
  DnssecStatus,
  Zone,
} from "@/lib/types";

interface ZoneDnssecTabProps {
  zone: Zone;
  /** Keeps the badge next to the zone name in sync. */
  onEnabledChanged?: (enabled: boolean) => void;
}

interface ActionResult {
  text: string;
  failed: boolean;
}

const KEY_STATE_STYLES: Record<DnssecKeyState, string> = {
  published: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  retired: "bg-gray-100 text-gray-600",
};

export default function ZoneDnssecTab({
  zone,
  onEnabledChanged,
}: ZoneDnssecTabProps) {
  const [status, setStatus] = useState<DnssecStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const [algorithm, setAlgorithm] = useState<DnssecAlgorithm>(
    DNSSEC_ALGORITHMS[0],
  );
  const [denial, setDenial] = useState<DnssecDenialMode>(
    DNSSEC_DENIAL_MODES[0],
  );
  const [splitKeys, setSplitKeys] = useState(false);
  const [rolloverRole, setRolloverRole] = useState<DnssecRolloverRole>("zsk");
  const [confirmInsecure, setConfirmInsecure] = useState(false);
  const [copiedDs, setCopiedDs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDnssecStatus(zone.name);
        if (active) {
          setStatus(data);
        }
      } catch (fetchError) {
        if (active) {
          setError(
            getErrorMessage(fetchError, "Failed to fetch DNSSEC status"),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchStatus();

    return () => {
      active = false;
    };
  }, [zone.name]);

  const dnssecEnabled = status?.enabled;
  useEffect(() => {
    if (dnssecEnabled !== undefined) {
      onEnabledChanged?.(dnssecEnabled);
    }
  }, [dnssecEnabled, onEnabledChanged]);

  useEffect(() => {
    if (copiedDs === null) {
      return;
    }

    const timer = setTimeout(() => setCopiedDs(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedDs]);

  const runAction = async (
    action: () => Promise<void>,
    fallbackError: string,
  ) => {
    setPending(true);
    setResult(null);
    try {
      await action();
    } catch (actionError) {
      setResult({
        text: getErrorMessage(actionError, fallbackError),
        failed: true,
      });
    } finally {
      setPending(false);
    }
  };

  const handleEnable = () =>
    runAction(async () => {
      const data = await enableDnssec(zone.name, {
        algorithm,
        denial,
        split_keys: splitKeys,
      });
      setStatus(data);
      setResult({
        text: "DNSSEC enabled. Register the DS records below in the parent zone.",
        failed: false,
      });
    }, "Failed to enable DNSSEC");

  const handleStartRollover = (role?: DnssecRolloverRole) =>
    runAction(async () => {
      const data = await startDnssecRollover(zone.name, role);
      setStatus(data);
      setResult({
        text: "Rollover started: the replacement key is pre-published.",
        failed: false,
      });
    }, "Failed to start key rollover");

  const handleDsSeen = () =>
    runAction(async () => {
      const data = await confirmDnssecDsSeen(zone.name);
      setStatus(data);
      setResult({
        text: "Rollover advanced: the new key is promoted.",
        failed: false,
      });
    }, "Failed to confirm DS seen");

  // A failed refresh must not report a mutation that already succeeded as failed.
  const refreshStatus = async () => {
    try {
      setStatus(await getDnssecStatus(zone.name));
    } catch {
      /* the tab re-fetches on the next open */
    }
  };

  // Keys promote and retire on server hold-downs, which nothing pushes to us.
  const handleRefresh = () =>
    runAction(async () => {
      setStatus(await getDnssecStatus(zone.name));
    }, "Failed to refresh DNSSEC status");

  const handleSign = () =>
    runAction(async () => {
      const message = await signDnssecZone(zone.name);
      setResult({ text: message, failed: false });
      await refreshStatus();
    }, "Failed to re-sign zone");

  const handleDisable = () =>
    runAction(async () => {
      const message = await disableDnssec(zone.name);
      setConfirmInsecure(false);
      setResult({ text: message, failed: false });
      // The keys are gone regardless of whether the refresh below lands.
      setStatus((prev) =>
        prev ? { ...prev, enabled: false, keys: [], ds_records: [] } : prev,
      );
      await refreshStatus();
    }, "Failed to disable DNSSEC");

  const handleCopyDs = async (index: number, presentation: string) => {
    try {
      await navigator.clipboard.writeText(presentation);
      setCopiedDs(index);
    } catch {
      setCopiedDs(null);
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading DNSSEC status...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!status) {
    return null;
  }

  const resultBanner = result && (
    <p
      className={`p-3 rounded-md border text-sm whitespace-pre-wrap ${
        result.failed
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-800"
      }`}
    >
      {result.text}
    </p>
  );

  if (!status.enabled) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">DNSSEC</h3>
          <p className="text-sm text-gray-500">
            This zone is not signed. Enabling DNSSEC generates a signing key and
            signs the whole zone; the DS records returned must then be
            registered in the parent zone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dnssec_algorithm"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Algorithm
            </label>
            <select
              id="dnssec_algorithm"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as DnssecAlgorithm)}
              className="w-full rounded"
            >
              {DNSSEC_ALGORITHMS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="dnssec_denial"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Denial of existence
            </label>
            <select
              id="dnssec_denial"
              value={denial}
              onChange={(e) => setDenial(e.target.value as DnssecDenialMode)}
              className="w-full rounded"
            >
              {DNSSEC_DENIAL_MODES.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">Fixed at enable time.</p>
          </div>
        </div>

        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={splitKeys}
            onChange={(e) => setSplitKeys(e.target.checked)}
          />
          <span>
            Split KSK/ZSK keys instead of one CSK, so the ZSK rolls without
            touching the parent DS
          </span>
        </label>

        {resultBanner}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleEnable}
            disabled={pending}
            className="btn-primary"
          >
            {pending ? "Enabling..." : "Enable DNSSEC"}
          </button>
        </div>
      </div>
    );
  }

  const publishedKeys = status.keys.filter((key) => key.state === "published");
  const rolloverInProgress = publishedKeys.length > 0;
  // The server rejects ds-seen for a ZSK-only rollover; those promote on a hold-down.
  const awaitingDsSeen = publishedKeys.some((key) => key.role !== "zsk");
  // The server refuses a new rollover until every key is active again.
  const retiringKeys = status.keys.some((key) => key.state === "retired");
  const splitKeyZone = status.keys.some((key) => key.role !== "csk");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">DNSSEC</h3>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            enabled
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
            {status.denial}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={pending}
            className="btn-secondary ml-auto"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Signed at Serial</p>
            <p className="text-base text-gray-900">{status.serial}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Earliest Signature Expiry</p>
            <p className="text-base text-gray-900">
              {status.earliest_signature_expires_at
                ? formatDateTime(status.earliest_signature_expires_at)
                : "-"}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Signatures renew automatically. The derived records (DNSKEY, RRSIG,
          the denial chain) can be inspected via the zone export&apos;s signed
          view.
        </p>
      </div>

      {resultBanner}

      <div>
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-2">
          Signing Keys
        </h3>
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key Tag
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Algorithm
                </th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Since
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {status.keys.map((key) => (
                <tr key={key.id}>
                  <td className="px-3 py-2 font-medium text-gray-900 uppercase">
                    {key.role}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${KEY_STATE_STYLES[key.state]}`}
                    >
                      {key.state}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{key.key_tag}</td>
                  <td className="px-3 py-2 text-gray-500">{key.algorithm}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {formatDateTime(key.state_changed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2 mb-2">
          DS Records for the Parent Zone
        </h3>
        {status.ds_records.length === 0 ? (
          <p className="text-sm text-gray-500">No DS records.</p>
        ) : (
          <ul className="space-y-2">
            {status.ds_records.map((ds, index) => (
              <li
                key={`${ds.key_tag}-${index}`}
                className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2"
              >
                <code className="min-w-0 flex-1 font-mono text-xs break-all">
                  {ds.presentation}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyDs(index, ds.presentation)}
                  className="shrink-0 text-sm font-medium text-green-600 hover:underline"
                >
                  {copiedDs === index ? "Copied" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Key Rollover
        </h3>
        {rolloverInProgress ? (
          awaitingDsSeen ? (
            <div className="p-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-900 space-y-2">
              <p>
                A rollover is in progress: the replacement key is pre-published.
                Register the new DS record below at the parent, wait out its
                TTL, then confirm here to promote the key. The confirmation is
                accepted once the publish hold-down has elapsed.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDsSeen}
                  disabled={pending}
                  className="btn-primary"
                >
                  {pending ? "Confirming..." : "Confirm DS Seen"}
                </button>
              </div>
            </div>
          ) : (
            <p className="p-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-900">
              A ZSK rollover is in progress: the replacement key is
              pre-published and is promoted automatically once the publish
              hold-down has elapsed. No parent DS is involved, so there is
              nothing to confirm.
            </p>
          )
        ) : retiringKeys ? (
          <p className="p-3 rounded-md border border-blue-200 bg-blue-50 text-sm text-blue-900">
            The previous key is retired and draining from resolver caches. It is
            removed once the retire hold-down has elapsed, and the next rollover
            can start then.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              Pre-publish a replacement key with the same algorithm, then
              promote it once the parent has the new DS.
            </p>
            <div className="flex items-center gap-2">
              {splitKeyZone && (
                <select
                  value={rolloverRole}
                  onChange={(e) =>
                    setRolloverRole(e.target.value as DnssecRolloverRole)
                  }
                  aria-label="Key to roll"
                  className="rounded"
                >
                  <option value="zsk">ZSK</option>
                  <option value="ksk">KSK</option>
                </select>
              )}
              <button
                type="button"
                onClick={() =>
                  handleStartRollover(splitKeyZone ? rolloverRole : undefined)
                }
                disabled={pending}
                className="btn-primary whitespace-nowrap"
              >
                {pending ? "Starting..." : "Start Rollover"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Re-sign
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-500">
            Discard the stored signatures and re-sign the whole zone — a
            recovery hatch when the signing state is doubted.
          </p>
          <button
            type="button"
            onClick={handleSign}
            disabled={pending}
            className="btn-primary whitespace-nowrap"
          >
            {pending ? "Signing..." : "Re-sign Zone"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-red-700 border-b border-red-200 pb-2">
          Disable DNSSEC
        </h3>
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-900 space-y-3">
          <p>
            Disabling deletes the signing keys and unsigns the zone. While the
            parent still publishes a DS record, this makes the zone bogus for
            validating resolvers: remove the DS from the parent first, then wait
            out its TTL.
          </p>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={confirmInsecure}
              onChange={(e) => setConfirmInsecure(e.target.checked)}
            />
            <span>
              The DS record is removed from the parent zone and its TTL has
              passed
            </span>
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleDisable}
              disabled={pending || !confirmInsecure}
              className="btn-danger"
            >
              {pending ? "Disabling..." : "Disable DNSSEC"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
