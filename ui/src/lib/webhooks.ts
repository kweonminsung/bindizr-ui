import { activityOperationLabel } from "./activity";
import { ApiError, readResponseError } from "./errors";
import { getLocalApiHeaders } from "./localApi";
import { ActivityTarget } from "./types";

interface WebhookSettings {
  name: string;
  url: string;
  operations: string[];
  enabled: boolean;
}

export interface Webhook extends WebhookSettings {
  id: number;
  signing_enabled: boolean;
}

export interface WebhookCollection {
  items: Webhook[];
  operations: string[];
}

export interface WebhookInput extends WebhookSettings {
  secret?: string;
  clear_secret?: boolean;
}

export interface WebhookDelivery {
  id: number;
  event_id: string;
  event_type: string;
  target?: ActivityTarget | null;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  http_status?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export function webhookEventLabel(event: string): string {
  return event === "webhook.test"
    ? "Webhook test"
    : activityOperationLabel(event);
}

async function requestWebhook(path: string, options?: RequestInit) {
  const response = await fetch(`/api/webhooks${path}`, {
    ...options,
    headers: getLocalApiHeaders(),
  });

  if (!response.ok) {
    const { message } = await readResponseError(
      response,
      `Webhook request failed (HTTP ${response.status})`,
    );
    throw new ApiError(message, response.status);
  }

  return response;
}

export async function getWebhooks(
  signal: AbortSignal,
): Promise<WebhookCollection> {
  const response = await requestWebhook("", { signal });
  return response.json();
}

export async function createWebhook(input: WebhookInput) {
  await requestWebhook("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateWebhook(id: number, input: WebhookInput) {
  await requestWebhook(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteWebhook(id: number) {
  await requestWebhook(`/${id}`, { method: "DELETE" });
}

export async function testWebhook(id: number) {
  await requestWebhook(`/${id}/test`, { method: "POST" });
}

export async function getWebhookDeliveries(id: number, signal: AbortSignal) {
  const response = await requestWebhook(`/${id}/deliveries`, { signal });
  const { items }: { items: WebhookDelivery[] } = await response.json();
  return items;
}
