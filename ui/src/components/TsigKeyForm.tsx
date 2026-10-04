import { useState } from "react";
import { createTsigKey } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { TSIG_ALGORITHMS, TsigAlgorithm, TsigKey } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";
import RoleSelect from "./RoleSelect";

interface TsigKeyFormProps {
  onSuccess: (tsigKey: TsigKey) => void;
  onCancel: () => void;
  /** Creates in this role, leaving the role picker fixed. */
  roleName?: string;
}

export default function TsigKeyForm({
  onSuccess,
  onCancel,
  roleName: fixedRoleName,
}: TsigKeyFormProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [algorithm, setAlgorithm] = useState<TsigAlgorithm>(TSIG_ALGORITHMS[0]);
  const [secret, setSecret] = useState("");
  const [roleName, setRoleName] = useState(fixedRoleName ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const tsigKey = await createTsigKey({
        name: name.trim(),
        algorithm,
        secret: secret.trim() || null,
        role_name: roleName,
      });
      onSuccess(tsigKey);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create TSIG key"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Create TSIG Key</h2>
        <p className="text-sm text-gray-500 mt-1">
          The key may sign what its role&apos;s grants permit.
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
            onChange={(e) => setAlgorithm(e.target.value as TsigAlgorithm)}
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
        <RoleSelect
          id="tsig_role_name"
          value={roleName}
          onChange={setRoleName}
          fixed={fixedRoleName !== undefined}
          hint="Its record:* grants authorize updates and zone:transfer authorizes transfers; a key that only signs NOTIFY may hold a role without grants."
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        {/* A role still loading, or failed to load, is not chosen yet. */}
        <button
          type="submit"
          disabled={submitting || !roleName}
          className="btn-primary"
        >
          {submitting ? "Creating..." : "Create TSIG Key"}
        </button>
      </div>
    </form>
  );
}
