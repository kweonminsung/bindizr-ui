import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelDnssecWithdrawal,
  confirmDnssecDsSeen,
  disableDnssec,
  enableDnssec,
  getDnssecPolicies,
  getDnssecStatus,
  setZoneDnssecPolicy,
  signDnssecZone,
  startDnssecRollover,
  withdrawDnssec,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import {
  DEFAULT_DNSSEC_POLICY_NAME,
  DnssecKeyState,
  DnssecPolicy,
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

const describePolicy = (policy: DnssecPolicy) =>
  `${policy.algorithm}, ${policy.denial.toUpperCase()}, ${
    policy.split_keys ? "split KSK/ZSK" : "single CSK"
  }`;

export default function ZoneDnssecTab({
  zone,
  onEnabledChanged,
}: ZoneDnssecTabProps) {
  const [status, setStatus] = useState<DnssecStatus | null>(null);
  const [policies, setPolicies] = useState<DnssecPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const [policyName, setPolicyName] = useState(DEFAULT_DNSSEC_POLICY_NAME);
  const [targetPolicy, setTargetPolicy] = useState("");
  const [rolloverRole, setRolloverRole] = useState<DnssecRolloverRole>("zsk");
  const [confirmInsecure, setConfirmInsecure] = useState(false);
  const [copiedDs, setCopiedDs] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      setLoading(true);
      setError(null);
      try {
        const [data, policyList] = await Promise.all([
          getDnssecStatus(zone.name),
          // Signing still works off the built-in policy if this listing fails.
          getDnssecPolicies().catch(() => [] as DnssecPolicy[]),
        ]);
        if (active) {
          setStatus(data);
          setPolicies(policyList);
          setTargetPolicy("");
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
      const data = await enableDnssec(zone.name, { policy: policyName });
      setStatus(data);
      setResult({
        text: "DNSSEC enabled. Register the DS records below in the parent zone.",
        failed: false,
      });
    }, "Failed to enable DNSSEC");

  const handleChangePolicy = () =>
    runAction(async () => {
      const data = await setZoneDnssecPolicy(zone.name, {
        policy: targetPolicy,
      });
      setStatus(data);
      setTargetPolicy("");
      setResult({
        text: `Zone moved to the "${data.policy?.name ?? targetPolicy}" policy.`,
        failed: false,
      });
    }, "Failed to change the zone's DNSSEC policy");

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

  const handleWithdraw = () =>
    runAction(async () => {
      const data = await withdrawDnssec(zone.name);
      setStatus(data);
      setResult({
        text: "Withdrawal published. A CDS-consuming parent drops the DS on its next poll.",
        failed: false,
      });
    }, "Failed to publish the DS withdrawal");

  const handleCancelWithdrawal = () =>
    runAction(async () => {
      const data = await cancelDnssecWithdrawal(zone.name);
      setStatus(data);
      setResult({
        text: "Withdrawal cancelled: the per-key CDS/CDNSKEY set returns on the next signing pass.",
        failed: false,
      });
    }, "Failed to cancel the DS withdrawal");

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
        prev
          ? {
              ...prev,
              enabled: false,
              policy: null,
              keys: [],
              ds_records: [],
              withdrawing: false,
            }
          : prev,
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

  const policiesLink = (
    <Link to="/dns/dnssec-policies" className="text-blue-600 hover:underline">
      DNSSEC policies
    </Link>
  );

  if (!status.enabled) {
    const selectedPolicy = policies.find(
      (policy) => policy.name === policyName,
    );

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">DNSSEC</h3>
          <p className="text-sm text-gray-500">
            This zone is not signed. Enabling DNSSEC generates the signing keys
            the chosen policy prescribes and signs the whole zone; the DS
            records returned must then be registered in the parent zone.
          </p>
        </div>

        <div>
          <label
            htmlFor="dnssec_policy"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            DNSSEC Policy
          </label>
          {policies.length === 0 ? (
            <p className="text-sm text-gray-500">
              Signing under the built-in <code>{policyName}</code> policy.
            </p>
          ) : (
            <select
              id="dnssec_policy"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              className="w-full rounded"
            >
              {policies.map((policy) => (
                <option key={policy.id} value={policy.name}>
                  {policy.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {selectedPolicy ? (
              <>
                {describePolicy(selectedPolicy)}. The denial mode and key layout
                are fixed for as long as the zone stays signed.
              </>
            ) : (
              <>Manage the parameter bundles under {policiesLink}.</>
            )}
          </p>
        </div>

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
  const currentPolicy = status.policy;
  const splitKeyZone =
    currentPolicy?.split_keys ?? status.keys.some((key) => key.role !== "csk");
  // The server rejects a policy whose denial mode or key layout differs.
  const compatiblePolicies = currentPolicy
    ? policies.filter(
        (policy) =>
          policy.name !== currentPolicy.name &&
          policy.denial === currentPolicy.denial &&
          policy.split_keys === currentPolicy.split_keys,
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">DNSSEC</h3>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            enabled
          </span>
          {currentPolicy && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
              {currentPolicy.denial}
            </span>
          )}
          {status.withdrawing && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              DS withdrawal published
            </span>
          )}
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

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Policy
        </h3>
        {currentPolicy ? (
          <>
            <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
              <p className="text-sm text-gray-500">Signing under</p>
              <p className="text-base text-gray-900 break-all">
                {currentPolicy.name}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {describePolicy(currentPolicy)}; signatures valid{" "}
                {currentPolicy.signature_validity_days} days, renewed with{" "}
                {currentPolicy.signature_refresh_days} days left.
              </p>
            </div>
            {compatiblePolicies.length === 0 ? (
              <p className="text-sm text-gray-500">
                No other policy shares this zone&apos;s denial mode and key
                layout, the two the zone cannot change while signed. Define one
                under {policiesLink} to move the zone — a different algorithm
                there starts an algorithm rollover.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Moving to a policy of another algorithm double-signs the zone
                  until the old keys leave after ds-seen. Timing changes apply
                  on the next signing pass.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={targetPolicy}
                    onChange={(e) => setTargetPolicy(e.target.value)}
                    aria-label="Policy to move to"
                    className="rounded"
                  >
                    <option value="">Select a policy</option>
                    {compatiblePolicies.map((policy) => (
                      <option key={policy.id} value={policy.name}>
                        {policy.name} ({policy.algorithm})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleChangePolicy}
                    disabled={pending || !targetPolicy || rolloverInProgress}
                    className="btn-primary whitespace-nowrap"
                  >
                    {pending ? "Moving..." : "Move Zone"}
                  </button>
                </div>
              </div>
            )}
            {rolloverInProgress && compatiblePolicies.length > 0 && (
              <p className="text-sm text-gray-500">
                A rollover is in progress; finish it before moving the zone.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            This server reports no policy for the zone.
          </p>
        )}
      </div>

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
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Step
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
                  <td className="px-3 py-2 text-gray-500">
                    {key.eligible_at
                      ? `${key.state === "published" ? "Promotable" : "Removable"} ${formatDateTime(key.eligible_at)}`
                      : "-"}
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
              promote it once the parent has the new DS. To change the
              algorithm, move the zone to a policy that uses it.
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
          Go Insecure
        </h3>
        <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-sm text-amber-900 space-y-3">
          <p>
            Step one: publish the RFC 8078 delete CDS/CDNSKEY pair, asking a
            CDS-consuming parent to drop this zone&apos;s DS records. Parents
            that do not consume CDS need the DS removed by hand.
          </p>
          <div className="flex justify-end">
            {status.withdrawing ? (
              <button
                type="button"
                onClick={handleCancelWithdrawal}
                disabled={pending}
                className="btn-secondary"
              >
                {pending ? "Cancelling..." : "Cancel Withdrawal"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={pending}
                className="btn-secondary"
              >
                {pending ? "Publishing..." : "Publish DS Withdrawal"}
              </button>
            )}
          </div>
        </div>
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-900 space-y-3">
          <p>
            Step two: disabling deletes the signing keys and unsigns the zone.
            While the parent still publishes a DS record, this makes the zone
            bogus for validating resolvers: remove the DS from the parent first,
            then wait out its TTL.
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
