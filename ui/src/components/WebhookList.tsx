import { describeCount, ListFooter, TABLE_HEADER_CLASS } from "./ListLayout";
import Notice from "./Notice";
import { Webhook } from "@/lib/webhooks";
import { activityOperationLabel } from "@/lib/activity";

interface WebhookListProps {
  webhooks: Webhook[] | null;
  error: string | null;
  deleting: boolean;
  onEdit: (webhook: Webhook) => void;
  onDeliveries: (webhook: Webhook) => void;
  onDelete: (webhook: Webhook) => void;
}

export default function WebhookList({
  webhooks,
  error,
  deleting,
  onEdit,
  onDeliveries,
  onDelete,
}: WebhookListProps) {
  return (
    <>
      {error && (
        <Notice tone="error" className="mx-4 mb-4">
          {error}
        </Notice>
      )}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th scope="col" className={TABLE_HEADER_CLASS}>
                Endpoint
              </th>
              <th
                scope="col"
                className={`hidden lg:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Operations
              </th>
              <th
                scope="col"
                className={`w-28 hidden md:table-cell ${TABLE_HEADER_CLASS}`}
              >
                Status
              </th>
              <th
                scope="col"
                className={`w-30 md:w-52 text-right ${TABLE_HEADER_CLASS}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {webhooks?.map((webhook) => (
              <tr key={webhook.id}>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 wrap-anywhere">
                    {webhook.name}
                  </p>
                  <p className="break-all text-gray-500">{webhook.url}</p>
                  <p className="mt-1 text-gray-600 md:hidden">
                    {webhook.enabled ? "Enabled" : "Disabled"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 wrap-anywhere lg:hidden">
                    {webhook.operations.map(activityOperationLabel).join(", ")}
                  </p>
                </td>
                <td className="hidden px-6 py-4 text-gray-600 wrap-anywhere lg:table-cell">
                  {webhook.operations.map(activityOperationLabel).join(", ")}
                </td>
                <td className="hidden px-6 py-4 text-gray-600 md:table-cell">
                  {webhook.enabled ? "Enabled" : "Disabled"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-2">
                    <button
                      type="button"
                      aria-label={`Deliveries for ${webhook.name}`}
                      onClick={() => onDeliveries(webhook)}
                      disabled={deleting}
                      className="font-medium text-gray-700 enabled:hover:underline disabled:opacity-50"
                    >
                      Deliveries
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${webhook.name}`}
                      onClick={() => onEdit(webhook)}
                      disabled={deleting}
                      className="font-medium text-gray-700 enabled:hover:underline disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${webhook.name}`}
                      onClick={() => onDelete(webhook)}
                      disabled={deleting}
                      className="font-medium text-red-600 enabled:hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!error && (
        <ListFooter
          summary={
            webhooks === null
              ? "Loading webhooks..."
              : describeCount(webhooks.length, "webhook", "webhooks")
          }
        />
      )}
    </>
  );
}
