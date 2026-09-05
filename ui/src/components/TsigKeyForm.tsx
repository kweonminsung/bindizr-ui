import { useState } from "react";
import { createTsigKey } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { TSIG_ALGORITHMS, TsigKey } from "@/lib/types";

interface TsigKeyFormProps {
  onSuccess: (tsigKey: TsigKey) => void;
  onCancel: () => void;
}

const GLOBAL_WARNING =
  "A Global Key can update every record of every zone without any grant. Create it anyway?";

export default function TsigKeyForm({ onSuccess, onCancel }: TsigKeyFormProps) {
  const [name, setName] = useState("");
  const [algorithm, setAlgorithm] = useState<string>(TSIG_ALGORITHMS[0]);
  const [secret, setSecret] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isGlobal && !window.confirm(GLOBAL_WARNING)) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const tsigKey = await createTsigKey({
        name: name.trim(),
        algorithm,
        secret: secret.trim() || null,
        global: isGlobal,
      });
      onSuccess(tsigKey);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to create TSIG key"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Create TSIG Key</h2>
        <p className="text-sm text-gray-500 mt-1">
          A Scoped Key does nothing until you grant it access to zones.
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
            placeholder="update-key"
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="algorithm"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Algorithm
          </label>
          <select
            id="algorithm"
            name="algorithm"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="w-full"
          >
            {TSIG_ALGORITHMS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="secret"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Secret (optional)
          </label>
          <input
            type="text"
            id="secret"
            name="secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Leave empty to generate a random secret"
            className="w-full font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-1">
            Paste a base64 secret to import an existing key.
          </p>
        </div>
        <label className="flex items-start space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
            className="mt-1"
          />
          <span>
            Global Key
            <span className="block text-amber-700">
              Updates every name and type in every zone, with no grant. Fixed at
              creation.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <p className="p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating..." : "Create TSIG Key"}
        </button>
      </div>
    </form>
  );
}
