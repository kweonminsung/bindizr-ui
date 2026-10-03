import { useState } from "react";
import { createRole } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { Role } from "@/lib/types";
import { useToast } from "@/contexts/ToastContext";

interface RoleFormProps {
  onSuccess: (role: Role) => void;
  onCancel: () => void;
}

export default function RoleForm({ onSuccess, onCancel }: RoleFormProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      onSuccess(
        await createRole({
          name: name.trim(),
          description: description.trim() || null,
        }),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create role"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Create Role</h2>
        <p className="text-sm text-gray-500 mt-1">
          A new role holds no grants; add them once it exists.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="role_name"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="role_name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            pattern="[A-Za-z0-9._\-]+"
            title="Letters, digits, '.', '_' and '-'"
            placeholder="external-dns-prod"
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Letters, digits, <code>.</code>, <code>_</code> and <code>-</code>.
          </p>
        </div>
        <div>
          <label
            htmlFor="role_description"
            className="block text-sm font-medium text-gray-600 mb-1"
          >
            Description (optional)
          </label>
          <input
            type="text"
            id="role_description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={255}
            placeholder="ExternalDNS in the prod clusters"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating..." : "Create Role"}
        </button>
      </div>
    </form>
  );
}
