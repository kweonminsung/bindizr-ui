import { useState } from "react";
import { createToken } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { toOptionalNumber } from "@/lib/form";
import { CreatedToken } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";
import RoleSelect from "./RoleSelect";

interface TokenFormProps {
  onSuccess: (created: CreatedToken) => void;
  onCancel: () => void;
  /** Creates in this role, leaving the role picker fixed. */
  roleName?: string;
}

export default function TokenForm({
  onSuccess,
  onCancel,
  roleName: fixedRoleName,
}: TokenFormProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [roleName, setRoleName] = useState(fixedRoleName ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const created = await createToken({
        name: name.trim(),
        description: description.trim() || null,
        expires_in_days: toOptionalNumber(expiresInDays, "Expiry"),
        role_name: roleName,
      });
      onSuccess(created);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create API token"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Create API Token</h2>
        <p className="text-sm text-gray-500 mt-1">
          The token may do what its role&apos;s grants permit.
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
        <RoleSelect
          id="token_role_name"
          value={roleName}
          onChange={setRoleName}
          fixed={fixedRoleName !== undefined}
          hint="Fixed at creation; the built-in admin role permits everything."
        />
      </div>

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
