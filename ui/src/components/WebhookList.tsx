import {
  describeCount,
  ListFooter,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import Badge from "./Badge";
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
        <Notice tone="error" className="m-4">
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
                className={`w-24 text-right @min-[38rem]/list:w-52 ${TABLE_HEADER_CLASS}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {webhooks?.map((webhook) => (
              <tr key={webhook.id}>
                <td className={`${TABLE_CELL_CLASS} align-top`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 font-medium text-gray-900 wrap-anywhere">
                      {webhook.name}
                    </span>
                    <Badge tone={webhook.enabled ? "success" : "neutral"}>
                      {webhook.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="truncate text-gray-500" title={webhook.url}>
                    {webhook.url}
                  </p>
                  <details className="mt-1 text-xs text-gray-600">
                    <summary className="cursor-pointer font-medium text-gray-700 hover:underline">
                      {webhook.operations.length}{" "}
                      {webhook.operations.length === 1
                        ? "operation"
                        : "operations"}
                    </summary>
                    <p className="mt-2 wrap-anywhere">{webhook.url}</p>
                    <ul className="mt-1 space-y-1">
                      {webhook.operations.map((operation) => (
                        <li key={operation} className="wrap-anywhere">
                          {activityOperationLabel(operation)}
                        </li>
                      ))}
                    </ul>
                  </details>
                </td>
                <td className={`${TABLE_CELL_CLASS} align-top`}>
                  <div className="flex flex-col items-end gap-x-3 gap-y-2 @min-[38rem]/list:flex-row @min-[38rem]/list:justify-end">
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
