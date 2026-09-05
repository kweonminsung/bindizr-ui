import { useState } from "react";
import { createDnssecPolicy } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toOptionalNumber } from "@/lib/form";
import {
  DNSSEC_ALGORITHMS,
  DNSSEC_DENIAL_MODES,
  DnssecAlgorithm,
  DnssecDenialMode,
  DnssecPolicy,
} from "@/lib/types";

interface DnssecPolicyFormProps {
  onSuccess: (policy: DnssecPolicy) => void;
  onCancel: () => void;
}

/** Shown as placeholders: an empty field takes the server's own default. */
const TIMING_FIELDS = [
  {
    key: "signature_validity_days",
    label: "Signature Validity (days)",
    placeholder: "14",
    hint: "Days a new signature stays valid.",
  },
  {
    key: "signature_refresh_days",
    label: "Signature Refresh (days)",
    placeholder: "5",
    hint: "Re-sign with this many days left; must be below the validity.",
  },
  {
    key: "zsk_lifetime_days",
    label: "ZSK Lifetime (days)",
    placeholder: "0",
    hint: "0 disables scheduled ZSK rollovers.",
  },
  {
    key: "rollover_publish_holddown_secs",
    label: "Publish Hold-down (seconds)",
    placeholder: "86400",
    hint: "Wait before a pre-published key may start signing.",
  },
  {
    key: "rollover_retire_holddown_secs",
    label: "Retire Hold-down (seconds)",
    placeholder: "172800",
    hint: "Wait before a retired key leaves the zone.",
  },
] as const;

type TimingKey = (typeof TIMING_FIELDS)[number]["key"];

export default function DnssecPolicyForm({
  onSuccess,
  onCancel,
}: DnssecPolicyFormProps) {
  const [name, setName] = useState("");
  const [algorithm, setAlgorithm] = useState<DnssecAlgorithm>(
    DNSSEC_ALGORITHMS[0],
  );
  const [denial, setDenial] = useState<DnssecDenialMode>(
    DNSSEC_DENIAL_MODES[0],
  );
  const [splitKeys, setSplitKeys] = useState(false);
  const [timing, setTiming] = useState<Record<TimingKey, string>>({
    signature_validity_days: "",
    signature_refresh_days: "",
    zsk_lifetime_days: "",
    rollover_publish_holddown_secs: "",
    rollover_retire_holddown_secs: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const policy = await createDnssecPolicy({
        name: name.trim(),
        algorithm,
        denial,
        split_keys: splitKeys,
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
      onSuccess(policy);
    } catch (error) {
      alert(getErrorMessage(error, "Failed to create DNSSEC policy"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Create DNSSEC Policy
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          The algorithm, denial mode and key layout are fixed once the policy
          exists; the timing below can be edited later.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="policy_name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="policy_name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="strict"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="policy_algorithm"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Algorithm
            </label>
            <select
              id="policy_algorithm"
              name="algorithm"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as DnssecAlgorithm)}
              className="w-full"
            >
              {DNSSEC_ALGORITHMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="policy_denial"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Denial of Existence
            </label>
            <select
              id="policy_denial"
              name="denial"
              value={denial}
              onChange={(e) => setDenial(e.target.value as DnssecDenialMode)}
              className="w-full"
            >
              {DNSSEC_DENIAL_MODES.map((option) => (
                <option key={option} value={option}>
                  {option.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-start space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={splitKeys}
            onChange={(e) => setSplitKeys(e.target.checked)}
            className="mt-1"
          />
          <span>
            Split keys
            <span className="block text-gray-500">
              A KSK/ZSK pair instead of one CSK, so the ZSK rolls without
              touching the parent DS.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIMING_FIELDS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={field.key}
                className="block text-sm font-medium text-gray-600 mb-1"
              >
                {field.label}
              </label>
              <input
                type="number"
                min="0"
                id={field.key}
                name={field.key}
                value={timing[field.key]}
                onChange={(e) =>
                  setTiming((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">{field.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating..." : "Create Policy"}
        </button>
      </div>
    </form>
  );
}
