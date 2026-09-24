import { useEffect, useState } from "react";
import { getTsigKeys, updateSecondary } from "@/lib/api";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import { Secondary, TsigKey, UpdateSecondaryPayload } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

interface SecondaryDetailsProps {
  secondary: Secondary;
  onUpdated: (secondary: Secondary) => void;
}

export default function SecondaryDetails({
  secondary,
  onUpdated,
}: SecondaryDetailsProps) {
  const toast = useToast();
  const [address, setAddress] = useState(secondary.address);
  const [enabled, setEnabled] = useState(secondary.enabled);
  const [notifyKey, setNotifyKey] = useState(secondary.notify_key ?? "");
  const [tsigKeys, setTsigKeys] = useState<TsigKey[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAddress(secondary.address);
    setEnabled(secondary.enabled);
    setNotifyKey(secondary.notify_key ?? "");
  }, [secondary]);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateSecondaryPayload = {};
    if (address.trim() !== secondary.address) {
      payload.address = address.trim();
    }
    if (enabled !== secondary.enabled) {
      payload.enabled = enabled;
    }
    if (notifyKey !== (secondary.notify_key ?? "")) {
      payload.notify_key = notifyKey;
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

      <div className="p-2.5 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-sm text-gray-500">Registered</p>
        <p className="text-base text-gray-900">
          {formatDateTime(secondary.created_at)}
        </p>
      </div>

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
    </div>
  );
}
