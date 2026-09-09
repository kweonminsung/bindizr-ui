import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  cancelDnssecWithdrawal,
  checkDnssecDs,
  confirmDnssecDsSeen,
  disableDnssec,
  enableDnssec,
  getDnssecPolicies,
  getDnssecStatus,
  signDnssecZone,
  startDnssecRollover,
  updateDnssecSettings,
  withdrawDnssec,
} from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorCode, getErrorMessage } from "@/lib/errors";
import {
  DEFAULT_DNSSEC_POLICY_NAME,
  DnssecDelegationInfo,
  DnssecKey,
  DnssecKeyState,
  DnssecPolicy,
  DnssecRolloverRole,
  DnssecStatus,
  Zone,
} from "@/lib/types";
import Notice from "./Notice";
import { useToast } from "@/contexts/ToastContext";

interface ZoneDnssecTabProps {
  zone: Zone;
  /** Keeps the badge next to the zone name in sync. */
  onEnabledChanged?: (enabled: boolean) => void;
}

/** The button at work, so only it shows progress. */
type PendingAction =
  | "enable"
  | "refresh"
  | "policy"
  | "rollover"
  | "ds-seen"
  | "withdraw"
  | "cancel-withdrawal"
  | "check-ds"
  | "parent-ns"
  | "sign"
  | "disable";

const KEY_STATE_STYLES: Record<DnssecKeyState, string> = {
  published: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  retired: "bg-gray-100 text-gray-600",
};

/** What to do next when a parent DS check refuses an action. */
const DS_CHECK_HINTS: Record<string, string> = {
  DNSSEC_DS_PUBLISHED:
    "Remove the DS at the parent (publish a withdrawal for a CDS-reading parent), then retry.",
  DNSSEC_DS_NOT_PUBLISHED:
    "Register the new DS at the parent, then use Check Parent DS to confirm it before retrying.",
  DNSSEC_DS_UNVERIFIED:
    "Set the parent nameservers below, or skip the check to proceed on your own word.",
  DNSSEC_STATE_CHANGED:
    "The zone's keys or parent nameservers changed while the parent was being asked. Retry.",
};

const describePolicy = (policy: DnssecPolicy) =>
  `${policy.algorithm}, ${policy.denial.toUpperCase()}, ${
    policy.split_keys ? "a KSK/ZSK pair" : "a single CSK"
  }`;

/** The detail beside the state pill. */
const describeDelegation = ({
  parent_ns_addrs,
  discovered,
  ds_state,
  ds_key_tags,
  ds_ttl,
}: DnssecDelegationInfo) => {
  const servers = `${parent_ns_addrs.join(", ")}${discovered ? " (discovered)" : ""}`;
  if (ds_state !== "published") {
    return `nothing served by ${servers}`;
  }
  const tags = `key tag${ds_key_tags.length === 1 ? "" : "s"} ${ds_key_tags.join(", ")}`;
  return `${tags} served by ${servers}${ds_ttl != null ? `, TTL ${ds_ttl}s` : ""}`;
};

export default function ZoneDnssecTab({
  zone,
  onEnabledChanged,
}: ZoneDnssecTabProps) {
  const toast = useToast();
  const [status, setStatus] = useState<DnssecStatus | null>(null);
  const [policies, setPolicies] = useState<DnssecPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const busy = pending !== null;

  const [policyName, setPolicyName] = useState(DEFAULT_DNSSEC_POLICY_NAME);
  const [targetPolicy, setTargetPolicy] = useState("");
  const [rolloverRole, setRolloverRole] = useState<DnssecRolloverRole>("zsk");
  const [skipDsCheckOnDisable, setSkipDsCheckOnDisable] = useState(false);
  const [skipDsCheckOnDsSeen, setSkipDsCheckOnDsSeen] = useState(false);
  const [skipHolddown, setSkipHolddown] = useState(false);
  const [parentNsAddrs, setParentNsAddrs] = useState("");
  // Separate from status so a refresh keeps the last check.
  const [delegation, setDelegation] = useState<DnssecDelegationInfo | null>(
    null,
  );
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
          setParentNsAddrs(data.parent_ns_addrs ?? "");
          setDelegation(null);
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
    action: PendingAction,
    run: () => Promise<void>,
    fallbackError: string,
  ) => {
    setPending(action);
    try {
      await run();
    } catch (actionError) {
      const message = getErrorMessage(actionError, fallbackError);
      const hint = DS_CHECK_HINTS[getErrorCode(actionError) ?? ""];
      toast.error(hint ? `${message} ${hint}` : message);
    } finally {
      setPending(null);
    }
  };

  const handleEnable = () =>
    runAction(
      "enable",
      async () => {
        const parentNs = parentNsAddrs.trim();
        const data = await enableDnssec(zone.name, {
          policy: policyName,
          // Omitted keeps the zone's setting; given, even empty, replaces it.
          parent_ns_addrs:
            parentNs === (status?.parent_ns_addrs ?? "") ? undefined : parentNs,
        });
        setStatus(data);
        setParentNsAddrs(data.parent_ns_addrs ?? "");
        toast.success("DNSSEC enabled. Register the DS records at the parent.");
      },
      "Failed to enable DNSSEC",
    );

  const handleChangePolicy = () =>
    runAction(
      "policy",
      async () => {
        const data = await updateDnssecSettings(zone.name, {
          policy: targetPolicy,
        });
        setStatus(data);
        setTargetPolicy("");
        toast.success(
          `Zone moved to the "${data.policy?.name ?? targetPolicy}" policy.`,
        );
      },
      "Failed to change the zone's DNSSEC policy",
    );

  const handleStartRollover = (role?: DnssecRolloverRole) =>
    runAction(
      "rollover",
      async () => {
        const data = await startDnssecRollover(zone.name, role);
        setStatus(data);
        toast.success(
          "Rollover started; the replacement key is pre-published.",
        );
      },
      "Failed to start key rollover",
    );

  const handleDsSeen = () =>
    runAction(
      "ds-seen",
      async () => {
        const data = await confirmDnssecDsSeen(zone.name, {
          skipDsCheck: skipDsCheckOnDsSeen,
          skipHolddown,
        });
        setSkipDsCheckOnDsSeen(false);
        setSkipHolddown(false);
        setStatus(data);
        toast.success("New key promoted.");
      },
      "Failed to confirm DS seen",
    );

  const handleWithdraw = () =>
    runAction(
      "withdraw",
      async () => {
        const data = await withdrawDnssec(zone.name);
        setStatus(data);
        toast.success(
          "Withdrawal published; the parent drops the DS on its next CDS poll.",
        );
      },
      "Failed to publish the DS withdrawal",
    );

  const handleCancelWithdrawal = () =>
    runAction(
      "cancel-withdrawal",
      async () => {
        const data = await cancelDnssecWithdrawal(zone.name);
        setStatus(data);
        toast.success("Withdrawal cancelled.");
      },
      "Failed to cancel the DS withdrawal",
    );

  const handleCheckDs = () =>
    runAction(
      "check-ds",
      async () => {
        const data = await checkDnssecDs(zone.name);
        setStatus(data);
        setDelegation(data.delegation ?? null);
      },
      "Failed to check the parent's DS",
    );

  const handleSetParentNsAddrs = () =>
    runAction(
      "parent-ns",
      async () => {
        const data = await updateDnssecSettings(zone.name, {
          parent_ns_addrs: parentNsAddrs.trim(),
        });
        setStatus(data);
        setParentNsAddrs(data.parent_ns_addrs ?? "");
        // Checked against the old servers.
        setDelegation(null);
        toast.success(
          data.parent_ns_addrs
            ? `Parent nameservers set to ${data.parent_ns_addrs}.`
            : "Parent nameservers cleared; the parent is discovered.",
        );
      },
      "Failed to set the parent nameservers",
    );

  const refreshStatus = async () => {
    try {
      setStatus(await getDnssecStatus(zone.name));
    } catch {
      /* the mutation already succeeded; the tab re-fetches on the next open */
    }
  };

  // Keys promote and retire on server hold-downs, which nothing pushes to us.
  const handleRefresh = () =>
    runAction(
      "refresh",
      async () => {
        setStatus(await getDnssecStatus(zone.name));
      },
      "Failed to refresh DNSSEC status",
    );

  const handleSign = () =>
    runAction(
      "sign",
      async () => {
        const message = await signDnssecZone(zone.name);
        toast.success(message);
        await refreshStatus();
      },
      "Failed to re-sign zone",
    );

  const handleDisable = () =>
    runAction(
      "disable",
      async () => {
        const message = await disableDnssec(zone.name, skipDsCheckOnDisable);
        setSkipDsCheckOnDisable(false);
        setDelegation(null);
        toast.success(message);
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
      },
      "Failed to disable DNSSEC",
    );

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
    return <Notice tone="error">{error}</Notice>;
  }

  if (!status) {
    return null;
  }

  const policiesLink = (
    <Link to="/dns/dnssec-policies" className="text-blue-600 hover:underline">
      DNSSEC policies
    </Link>
  );

  const parentNsUnchanged =
    parentNsAddrs.trim() === (status.parent_ns_addrs ?? "");

  if (!status.enabled) {
    const selectedPolicy = policies.find(
      (policy) => policy.name === policyName,
    );

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">DNSSEC</h3>
          <p className="text-sm text-gray-500">
            Not signed. Enabling generates keys and signs the zone; register the
            DS records at the parent afterwards.
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
                {describePolicy(selectedPolicy)}. Denial and key layout are
                fixed while signed.
              </>
            ) : (
              <>Manage policies under {policiesLink}.</>
            )}
          </p>
        </div>

        <div>
          <label
            htmlFor="dnssec_parent_ns_addrs"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Parent Nameservers
          </label>
          <input
            type="text"
            id="dnssec_parent_ns_addrs"
            value={parentNsAddrs}
            onChange={(e) => setParentNsAddrs(e.target.value)}
            placeholder="Discovered through the system resolver"
            className="w-full"
          />
          <p className="text-sm text-gray-500 mt-1">
            Optional. Comma-separated host[:port] asked for the DS before
            disabling; empty discovers the parent.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            className="btn-primary"
          >
            {pending === "enable" ? "Enabling..." : "Enable DNSSEC"}
          </button>
        </div>
      </div>
    );
  }

  const publishedKeys = status.keys.filter((key) => key.state === "published");
  const rolloverInProgress = publishedKeys.length > 0;
  // ZSK-only rollovers promote on a hold-down, not on ds-seen.
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
  const selectedPolicy = compatiblePolicies.find(
    (policy) => policy.name === targetPolicy,
  );
  // A new algorithm starts a rollover.
  const algorithmRollover =
    !!selectedPolicy && selectedPolicy.algorithm !== currentPolicy?.algorithm;
  const moveBlocked = rolloverInProgress || (retiringKeys && algorithmRollover);

  // ZSKs have no DS; the rest need a parent check.
  const atParent = (key: DnssecKey) => {
    if (!delegation || key.role === "zsk") {
      return "-";
    }
    const checked = delegation.keys.find((entry) => entry.id === key.id);
    return checked ? (checked.ds_published ? "Yes" : "No") : "-";
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">DNSSEC</h3>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Enabled
          </span>
          {currentPolicy && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
              {currentPolicy.denial}
            </span>
          )}
          {status.withdrawing && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Withdrawing DS
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
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
          Signatures renew automatically; derived records are in the signed
          export.
        </p>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
          <p className="text-sm text-gray-500">
            Ask the parent&apos;s nameservers what DS they serve for the zone.
          </p>
          <button
            type="button"
            onClick={handleCheckDs}
            disabled={busy}
            className="btn-secondary whitespace-nowrap"
          >
            {pending === "check-ds" ? "Checking..." : "Check Parent DS"}
          </button>
        </div>
        {delegation && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-sm text-gray-600">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                delegation.ds_state === "published"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {delegation.ds_state === "published" ? "DS published" : "No DS"}
            </span>
            <span className="break-all">{describeDelegation(delegation)}</span>
            <span className="ml-auto whitespace-nowrap text-gray-400">
              {formatDateTime(delegation.checked_at)}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Parent Nameservers
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="text"
            value={parentNsAddrs}
            onChange={(e) => setParentNsAddrs(e.target.value)}
            placeholder="ns1.parent.example, ns2.parent.example:5353"
            aria-label="Parent nameservers"
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleSetParentNsAddrs}
            disabled={busy || parentNsUnchanged}
            className="btn-primary whitespace-nowrap"
          >
            {pending === "parent-ns" ? "Saving..." : "Save"}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Comma-separated host[:port] asked for the zone&apos;s DS before
          disabling; empty discovers the parent.
        </p>
      </div>

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
                No other policy matches the zone&apos;s denial and key layout.
                See {policiesLink}.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-500">
                  A different algorithm starts an algorithm rollover.
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
                    disabled={busy || !targetPolicy || moveBlocked}
                    className="btn-primary whitespace-nowrap"
                  >
                    {pending === "policy" ? "Moving..." : "Move Zone"}
                  </button>
                </div>
              </div>
            )}
            {moveBlocked && compatiblePolicies.length > 0 && (
              <p className="text-sm text-gray-500">
                {rolloverInProgress
                  ? "Finish the rollover before moving the zone."
                  : "A new algorithm can start once the retired key is removed."}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">
            No policy reported for the zone.
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
                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  At Parent
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
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${KEY_STATE_STYLES[key.state]}`}
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
                  <td className="px-3 py-2 text-gray-500">{atParent(key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Key Rollover
        </h3>
        {rolloverInProgress ? (
          awaitingDsSeen ? (
            <Notice tone="info" className="space-y-3">
              <p>
                Register the new DS at the parent, wait out its TTL, then
                confirm to promote the key. The parent&apos;s nameservers are
                asked for the new DS first.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div className="space-y-1">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={skipDsCheckOnDsSeen}
                      onChange={(e) => setSkipDsCheckOnDsSeen(e.target.checked)}
                    />
                    <span>
                      Skip the parent DS check (unsafe while the DS is not
                      published)
                    </span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={skipHolddown}
                      onChange={(e) => setSkipHolddown(e.target.checked)}
                    />
                    <span>
                      Skip the hold-down (resolvers caching the old keys fail
                      until it expires; for a compromised key)
                    </span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleDsSeen}
                  disabled={busy}
                  className="btn-primary whitespace-nowrap"
                >
                  {pending === "ds-seen" ? "Confirming..." : "Confirm DS Seen"}
                </button>
              </div>
            </Notice>
          ) : (
            <Notice tone="info">
              ZSK rollover in progress; the new key is promoted after the
              hold-down. No DS change needed.
            </Notice>
          )
        ) : retiringKeys ? (
          <Notice tone="info">
            The retired key is removed after the hold-down; the next rollover
            can start then.
          </Notice>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              Pre-publish a replacement key; promote it once the parent has its
              DS.
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
                disabled={busy}
                className="btn-primary whitespace-nowrap"
              >
                {pending === "rollover" ? "Starting..." : "Start Rollover"}
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
            Discard stored signatures and re-sign the zone.
          </p>
          <button
            type="button"
            onClick={handleSign}
            disabled={busy}
            className="btn-primary whitespace-nowrap"
          >
            {pending === "sign" ? "Signing..." : "Re-sign Zone"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-red-700 border-b border-red-200 pb-2">
          Disable DNSSEC
        </h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-500">
            Remove the DS at the parent first: publish a withdrawal for a
            CDS-reading parent, or remove it at the registrar.
          </p>
          {status.withdrawing ? (
            <button
              type="button"
              onClick={handleCancelWithdrawal}
              disabled={busy}
              className="btn-secondary whitespace-nowrap"
            >
              {pending === "cancel-withdrawal"
                ? "Cancelling..."
                : "Cancel Withdrawal"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={busy}
              className="btn-secondary whitespace-nowrap"
            >
              {pending === "withdraw"
                ? "Publishing..."
                : "Publish DS Withdrawal"}
            </button>
          )}
        </div>
        <div className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-900 space-y-3">
          <p>
            Deletes the keys and unsigns the zone. Refused while the parent
            still serves a DS or cannot be reached.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={skipDsCheckOnDisable}
                onChange={(e) => setSkipDsCheckOnDisable(e.target.checked)}
              />
              <span>
                Skip the parent DS check (unsafe while a DS is still published)
              </span>
            </label>
            <button
              type="button"
              onClick={handleDisable}
              disabled={busy}
              className="btn-danger whitespace-nowrap"
            >
              {pending === "disable" ? "Disabling..." : "Disable DNSSEC"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
