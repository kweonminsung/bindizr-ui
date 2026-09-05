import { useState } from "react";
import { createToken } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toOptionalNumber } from "@/lib/form";
import { CreatedToken } from "@/lib/types";

interface TokenFormProps {
  onSuccess: (created: CreatedToken) => void;
  onCancel: () => void;
}

const GLOBAL_WARNING =
  "A Global Token can manage every zone and the zone plane, with no grant. Create it anyway?";

export default function TokenForm({ onSuccess, onCancel }: TokenFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
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
      const created = await createToken({
        name: name.trim(),
        description: description.trim() || null,
        expires_in_days: toOptionalNumber(expiresInDays, "Expiry"),
        global: isGlobal,
      });
      onSuccess(created);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to create API token"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Create API Token</h2>
        <p className="text-sm text-gray-500 mt-1">
          The secret is shown once, right after creation. A Scoped Token does
          nothing until you grant it access to zones.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="token_name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="token_name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            pattern="[A-Za-z0-9._\-]+"
            title="Letters, digits, '.', '_' and '-'"
            placeholder="external-dns"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Letters, digits, <code>.</code>, <code>_</code> and <code>-</code>.
          </p>
        </div>
        <div>
          <label
            htmlFor="token_description"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Description (optional)
          </label>
          <input
            type="text"
            id="token_description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            placeholder="ExternalDNS in the prod cluster"
            className="w-full"
          />
        </div>
        <div>
          <label
            htmlFor="token_expires_in_days"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Expires In (days, optional)
          </label>
          <input
            type="number"
            id="token_expires_in_days"
            name="expires_in_days"
            min="1"
            max="36500"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            placeholder="Leave empty for a token that never expires"
            className="w-full"
          />
        </div>
        <label className="flex items-start space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
            className="mt-1"
          />
          <span>
            Global Token
            <span className="block text-amber-700">
              Manages every zone and the zone plane itself, with no grant. Fixed
              at creation.
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
          {submitting ? "Creating..." : "Create API Token"}
        </button>
      </div>
    </form>
  );
}
