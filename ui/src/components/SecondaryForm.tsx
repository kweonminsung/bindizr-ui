import { useEffect, useState } from "react";
import { createSecondary, getTsigKeys } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { TsigKey } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

interface SecondaryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SecondaryForm({
  onSuccess,
  onCancel,
}: SecondaryFormProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notifyKey, setNotifyKey] = useState("");
  const [tsigKeys, setTsigKeys] = useState<TsigKey[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);
    try {
      await createSecondary({
        name: name.trim(),
        address: address.trim(),
        notify_key: notifyKey || null,
      });
      toast.success(`Registered "${name.trim()}".`);
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to register secondary"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Register Secondary</h2>
        <p className="text-sm text-gray-500 mt-1">
          It receives NOTIFY and may pull zones from this address.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ns2"
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            placeholder="ns2.example.net:53"
            className="w-full font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-1">
            host[:port], port 53 when left out; a hostname is resolved when
            used.
          </p>
        </div>
        <div>
          <label
            htmlFor="notify_key"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            NOTIFY Key (optional)
          </label>
          <select
            id="notify_key"
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
          <p className="text-sm text-gray-500 mt-1">
            Signs every NOTIFY to this server with the key.
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Registering..." : "Register Secondary"}
        </button>
      </div>
    </form>
  );
}
