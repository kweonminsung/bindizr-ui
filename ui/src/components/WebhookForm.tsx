import { useState } from "react";
import { activityOperationLabel } from "@/lib/activity";
import { Webhook, WebhookInput } from "@/lib/webhooks";
import { ModalContent } from "./Modal";
import Notice from "./Notice";

interface WebhookFormProps {
  webhook: Webhook | null;
  operations: string[];
  saving: boolean;
  error: string | null;
  onSubmit: (input: WebhookInput) => void;
  onCancel: () => void;
}

export default function WebhookForm({
  webhook,
  operations,
  saving,
  error,
  onSubmit,
  onCancel,
}: WebhookFormProps) {
  const [name, setName] = useState(webhook?.name ?? "");
  const [url, setUrl] = useState(webhook?.url ?? "");
  const [secret, setSecret] = useState("");
  const [enabled, setEnabled] = useState(webhook?.enabled ?? true);
  const [subscribedOperations, setSubscribedOperations] = useState(
    webhook?.operations ?? [],
  );
  const available = new Set(operations);
  const supportedOperations = subscribedOperations.filter((operation) =>
    available.has(operation),
  );
  const operationsToSave = enabled ? supportedOperations : subscribedOperations;
  const canSave =
    !saving &&
    name.trim() !== "" &&
    operationsToSave.length > 0 &&
    (webhook !== null || secret.trim() !== "");

  const toggleOperation = (operation: string) => {
    setSubscribedOperations((previous) =>
      previous.includes(operation)
        ? previous.filter((value) => value !== operation)
        : [...previous, operation],
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    onSubmit({
      name: name.trim(),
      url: url.trim(),
      secret: secret.trim() ? secret : undefined,
      operations: operationsToSave,
      enabled,
    });
  };

  return (
    <ModalContent
      header={
        <h2 className="text-2xl font-bold text-gray-800">
          {webhook ? "Edit Webhook" : "Create Webhook"}
        </h2>
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="webhook-form"
            disabled={!canSave}
            className="btn-primary"
          >
            {saving ? "Saving..." : webhook ? "Save Changes" : "Create Webhook"}
          </button>
        </div>
      }
    >
      <form id="webhook-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <fieldset disabled={saving} className="min-w-0 space-y-4">
          <div>
            <label
              htmlFor="webhook-name"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Name
            </label>
            <input
              id="webhook-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="webhook-url"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Endpoint URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/webhooks/bindizr"
              required
              className="w-full"
            />
          </div>
          <div>
            <label
              htmlFor="webhook-secret"
              className="block text-sm font-medium text-gray-600 mb-1"
            >
              Signing secret {webhook && "(optional)"}
            </label>
            <input
              id="webhook-secret"
              type="password"
              autoComplete="new-password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required={!webhook}
              aria-describedby="webhook-secret-hint"
              className="w-full font-mono"
            />
            <p id="webhook-secret-hint" className="mt-1 text-sm text-gray-500">
              {webhook
                ? "Leave empty to keep the current secret."
                : "Use the same secret to verify signatures on the receiving server."}
            </p>
          </div>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium text-gray-600">
              Operations (select at least one)
            </legend>
            {operations.length === 0 && (
              <p className="text-sm text-gray-500">
                No operations are available to subscribe to.
              </p>
            )}
            {operations.length > 0 &&
              operationsToSave.length < subscribedOperations.length && (
                <Notice tone="warning">
                  Saving removes operations that this UI can no longer observe.
                </Notice>
              )}
            <div className="grid gap-2 sm:grid-cols-2">
              {operations.map((operation) => (
                <label
                  key={operation}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={subscribedOperations.includes(operation)}
                    onChange={() => toggleOperation(operation)}
                    className="accent-(--primary)"
                  />
                  {activityOperationLabel(operation)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="accent-(--primary)"
            />
            Enabled
          </label>
        </fieldset>
      </form>
    </ModalContent>
  );
}
