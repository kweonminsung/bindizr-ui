import { useEffect, useState } from "react";
import { updateDnssecPolicy } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { toOptionalNumber } from "@/lib/form";
import { DEFAULT_DNSSEC_POLICY_NAME, DnssecPolicy } from "@/lib/types";

interface DnssecPolicyDetailsProps {
  policy: DnssecPolicy;
  onUpdated: (policy: DnssecPolicy) => void;
}

const TIMING_FIELDS = [
  {
    key: "signature_validity_days",
    label: "Signature Validity (days)",
    hint: "Days a new signature stays valid.",
  },
  {
    key: "signature_refresh_days",
    label: "Signature Refresh (days)",
    hint: "Re-sign with this many days left; must be below the validity.",
  },
  {
    key: "zsk_lifetime_days",
    label: "ZSK Lifetime (days)",
    hint: "0 disables scheduled ZSK rollovers.",
  },
  {
    key: "rollover_publish_holddown_secs",
    label: "Publish Hold-down (seconds)",
    hint: "Wait before a pre-published key may start signing.",
  },
  {
    key: "rollover_retire_holddown_secs",
    label: "Retire Hold-down (seconds)",
    hint: "Wait before a retired key leaves the zone.",
  },
] as const;

type TimingKey = (typeof TIMING_FIELDS)[number]["key"];

const toFormState = (policy: DnssecPolicy): Record<TimingKey, string> =>
  Object.fromEntries(
    TIMING_FIELDS.map((field) => [field.key, String(policy[field.key])]),
  ) as Record<TimingKey, string>;

export default function DnssecPolicyDetails({
  policy,
  onUpdated,
}: DnssecPolicyDetailsProps) {
  const [timing, setTiming] = useState(() => toFormState(policy));
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTiming(toFormState(policy));
    setSaved(false);
    setError(null);
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateDnssecPolicy(policy.name, {
        signature_validity_days: toOptionalNumber(
          timing.signature_validity_days,
          "Signature validity",
        ),
        signature_refresh_days: toOptionalNumber(
          timing.signature_refresh_days,
          "Signature refresh",
        ),
        zsk_lifetime_days: toOptionalNumber(
          timing.zsk_lifetime_days,
          "ZSK lifetime",
        ),
        rollover_publish_holddown_secs: toOptionalNumber(
          timing.rollover_publish_holddown_secs,
          "Publish hold-down",
        ),
        rollover_retire_holddown_secs: toOptionalNumber(
          timing.rollover_retire_holddown_secs,
          "Retire hold-down",
        ),
      });
      onUpdated(updated);
      setSaved(true);
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Failed to update DNSSEC policy"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800 break-all">
          {policy.name}
        </h2>
        {policy.name === DEFAULT_DNSSEC_POLICY_NAME && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            built-in
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Algorithm</p>
            <p className="text-base text-gray-900 break-all">
              {policy.algorithm}
            </p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Denial</p>
            <p className="text-base text-gray-900 uppercase">{policy.denial}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Key Layout</p>
            <p className="text-base text-gray-900">
              {policy.split_keys ? "Split KSK/ZSK" : "Single CSK"}
            </p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-base text-gray-900">
              {formatDateTime(policy.created_at)}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          The algorithm, denial mode and key layout are fixed. Moving a zone to
          a policy of another algorithm rolls its keys; the denial mode and key
          layout can only change by disabling and re-enabling DNSSEC.
        </p>
        <p className="text-sm text-gray-500">
          Zones sign under this policy from their DNSSEC tab: choose it when
          enabling DNSSEC, or move a signed zone with a matching denial mode and
          key layout to it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 border-b border-gray-200 pb-2">
          Timing
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIMING_FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`edit_${field.key}`}
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                {field.label}
              </label>
              <input
                type="number"
                min="0"
                id={`edit_${field.key}`}
                name={field.key}
                value={timing[field.key]}
                onChange={(e) =>
                  setTiming((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                required
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">{field.hint}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-500">
          Changes take effect on the next signing pass or maintenance scan.
        </p>

        {error && (
          <p className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p className="p-3 rounded-md border border-green-200 bg-green-50 text-sm text-green-800">
            Timing saved.
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving..." : "Save Timing"}
          </button>
        </div>
      </form>
    </div>
  );
}
