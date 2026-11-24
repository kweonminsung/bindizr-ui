import { useEffect, useState } from "react";
import { activityTargetLabel } from "@/lib/activity";
import { useToast } from "@/contexts/ToastContext";
import { formatDateTime } from "@/lib/datetime";
import { getErrorMessage } from "@/lib/errors";
import {
  getWebhookDeliveries,
  testWebhook,
  webhookEventLabel,
  Webhook,
  WebhookDelivery,
} from "@/lib/webhooks";
import {
  describeCount,
  ListFooter,
  ListToolbar,
  TABLE_CELL_CLASS,
  TABLE_HEADER_CLASS,
} from "./ListLayout";
import { ModalContent } from "./Modal";
import Notice from "./Notice";
import Badge from "./Badge";

const STATUS_LABELS = {
  pending: "Pending",
  delivered: "Delivered",
  failed: "Failed",
} satisfies Record<WebhookDelivery["status"], string>;

const STATUS_TONES = {
  pending: "neutral",
  delivered: "success",
  failed: "warning",
} as const satisfies Record<WebhookDelivery["status"], string>;

interface WebhookDeliveriesProps {
  webhook: Webhook;
}

export default function WebhookDeliveries({ webhook }: WebhookDeliveriesProps) {
  const toast = useToast();
  const [testing, setTesting] = useState(false);
  const [revision, setRevision] = useState(0);
  const [listing, setListing] = useState<
    ({ deliveries: WebhookDelivery[] } | { error: string }) & {
      revision: number;
    }
  >();
  const current = listing?.revision === revision ? listing : undefined;
  const deliveries =
    current && "deliveries" in current ? current.deliveries : null;
  const error = current && "error" in current ? current.error : null;
  const id = webhook.id;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDeliveries() {
      try {
        const deliveries = await getWebhookDeliveries(id, controller.signal);
        if (!controller.signal.aborted) {
          setListing({ deliveries, revision });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListing({
            error: getErrorMessage(error, "Failed to load webhook deliveries"),
            revision,
          });
        }
      }
    }

    fetchDeliveries();
    return () => controller.abort();
  }, [id, revision]);

  const handleTest = async () => {
    setTesting(true);
    try {
      await testWebhook(id);
      toast.success("Test delivery queued.");
      setRevision((previous) => previous + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to queue test delivery"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <ModalContent
      header={
        <>
          <h2 className="text-2xl font-bold text-gray-800">Delivery History</h2>
          <p className="text-sm text-gray-500 wrap-anywhere">{webhook.name}</p>
        </>
      }
    >
      <div className="@container/list rounded-md border border-gray-200">
        <ListToolbar
          actions={
            <>
              <button
                type="button"
                onClick={() => setRevision((previous) => previous + 1)}
                disabled={!current || testing}
                className="btn-secondary"
              >
                Refresh Deliveries
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="btn-primary"
              >
                {testing ? "Queueing..." : "Send Test"}
              </button>
            </>
          }
        />
        {error && (
          <Notice tone="error" className="mx-4 mb-4">
            {error}
          </Notice>
        )}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className={`hidden w-40 @min-[40rem]/list:table-cell ${TABLE_HEADER_CLASS}`}
                  title="When the delivery was queued"
                >
                  When
                </th>
                <th scope="col" className={TABLE_HEADER_CLASS}>
                  Event
                </th>
                <th scope="col" className={TABLE_HEADER_CLASS}>
                  Delivery status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deliveries?.map((delivery) => {
                const queuedAt = (
                  <time dateTime={delivery.created_at}>
                    {formatDateTime(delivery.created_at)}
                  </time>
                );
                const target = delivery.target
                  ? activityTargetLabel(delivery.target)
                  : "";
                return (
                  <tr key={delivery.id}>
                    <td
                      className={`hidden align-top text-gray-500 @min-[40rem]/list:table-cell ${TABLE_CELL_CLASS}`}
                    >
                      {queuedAt}
                    </td>
                    <td className={`align-top ${TABLE_CELL_CLASS}`}>
                      <p className="mb-1 text-xs text-gray-500 @min-[40rem]/list:hidden">
                        Queued {queuedAt}
                      </p>
                      <p className="font-medium text-gray-900 wrap-anywhere">
                        {webhookEventLabel(delivery.event_type)}
                      </p>
                      {target && (
                        <p className="mt-1 text-xs text-gray-600 wrap-anywhere">
                          {target}
                        </p>
                      )}
                      <code
                        className="text-xs text-gray-500 break-all"
                        title="Event ID"
                      >
                        {delivery.event_id}
                      </code>
                    </td>
                    <td className={`align-top ${TABLE_CELL_CLASS}`}>
                      <Badge tone={STATUS_TONES[delivery.status]}>
                        {STATUS_LABELS[delivery.status]}
                      </Badge>
                      <p className="mt-1 text-xs text-gray-500">
                        {delivery.attempts}{" "}
                        {delivery.attempts === 1 ? "attempt" : "attempts"}
                        {delivery.http_status
                          ? ` · HTTP ${delivery.http_status}`
                          : ""}
                      </p>
                      {delivery.error_message && (
                        <details className="mt-1 text-xs text-gray-600">
                          <summary className="cursor-pointer font-medium text-gray-700 hover:underline">
                            View error
                          </summary>
                          <p className="mt-1 whitespace-pre-wrap wrap-anywhere">
                            {delivery.error_message}
                          </p>
                        </details>
                      )}
                      {delivery.updated_at !== delivery.created_at && (
                        <p className="mt-1 text-xs text-gray-500">
                          Last updated{" "}
                          <time dateTime={delivery.updated_at}>
                            {formatDateTime(delivery.updated_at)}
                          </time>
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!error && (
          <ListFooter
            summary={
              deliveries === null
                ? "Loading deliveries..."
                : describeCount(deliveries.length, "delivery", "deliveries")
            }
          />
        )}
      </div>
    </ModalContent>
  );
}
