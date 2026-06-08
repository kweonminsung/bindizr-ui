import {
  CreateRecordPayload,
  ListResult,
  NotifyZonePayload,
  Pagination,
  Record,
  RecordListQuery,
  UpdateRecordPayload,
  Zone,
  ZoneListQuery,
  ZonePayload,
} from "./types";
import { getLocalApiHeaders } from "./localApi";

const API_BASE_URL = "/api/bindizr/proxy";

const getHeaders = () => getLocalApiHeaders();

const appendQueryParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | undefined | null,
) => {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, String(value));
  }
};

interface ListResponse<T> {
  items: T[];
  pagination: Pagination;
}

const toListResult = <T>(response: ListResponse<T>): ListResult<T> => ({
  items: response.items,
  pagination: response.pagination,
  hasNext:
    response.pagination.offset + response.items.length <
    response.pagination.total,
});

async function getZoneListResult(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<Zone>> {
  const params = new URLSearchParams();
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "limit", queryParams.limit);
  appendQueryParam(params, "offset", queryParams.offset);

  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/zones${query ? `?${query}` : ""}`,
    {
      headers: await getHeaders(),
    },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to fetch zones");
  }
  return toListResult((await response.json()) as ListResponse<Zone>);
}

export async function getZones(
  queryParams: ZoneListQuery = {},
): Promise<Zone[]> {
  return (await getZoneListResult(queryParams)).items;
}

export async function getZonesPage(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<Zone>> {
  return getZoneListResult({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });
}

async function parseJsonError(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const data = JSON.parse(text) as { error?: string; message?: string };
    return data.error || data.message || text;
  } catch {
    return text;
  }
}

async function throwApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  const errorText = await parseJsonError(response, fallback);
  console.error(`${fallback}:`, errorText);
  throw new Error(errorText);
}

async function getRecordListResult(
  queryParams: RecordListQuery = {},
): Promise<ListResult<Record>> {
  const params = new URLSearchParams();
  appendQueryParam(params, "zone_name", queryParams.zone_name);
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "record_type", queryParams.record_type);
  appendQueryParam(params, "limit", queryParams.limit);
  appendQueryParam(params, "offset", queryParams.offset);

  const query = params.toString();
  const url = `${API_BASE_URL}/records${query ? `?${query}` : ""}`;
  const response = await fetch(url, { headers: await getHeaders() });
  if (!response.ok) {
    await throwApiError(response, "Failed to fetch records");
  }
  return toListResult((await response.json()) as ListResponse<Record>);
}

export async function getRecords(
  queryParams: RecordListQuery = {},
): Promise<Record[]> {
  return (await getRecordListResult(queryParams)).items;
}

export async function getRecordsPage(
  queryParams: RecordListQuery = {},
): Promise<ListResult<Record>> {
  return getRecordListResult({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });
}

export async function createZone(zone: ZonePayload): Promise<Zone> {
  const response = await fetch(`${API_BASE_URL}/zones`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to create zone");
  }
  return (await response.json()).zone as Zone;
}

export async function createRecord(
  record: CreateRecordPayload,
): Promise<Record> {
  const response = await fetch(`${API_BASE_URL}/records`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to create record");
  }
  return (await response.json()).record as Record;
}

export async function updateZone(
  name: string,
  zone: ZonePayload,
): Promise<Zone> {
  const response = await fetch(
    `${API_BASE_URL}/zones/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(zone),
    },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to update zone");
  }
  return (await response.json()).zone as Zone;
}

export async function deleteZone(name: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/zones/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
      headers: await getHeaders(),
    },
  );
  if (!response.ok) {
    await throwApiError(response, "Failed to delete zone");
  }
}

export async function updateRecord(
  id: number,
  record: UpdateRecordPayload,
): Promise<Record> {
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: "PUT",
    headers: await getHeaders(),
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to update record");
  }
  return (await response.json()).record as Record;
}

export async function deleteRecord(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to delete record");
  }
}

export async function notifyZones(
  zoneName?: string | null,
  force = false,
): Promise<string> {
  const body: NotifyZonePayload = {
    force,
    zone_name: zoneName ?? null,
  };

  const response = await fetch(`${API_BASE_URL}/notify/zones`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await throwApiError(response, "Failed to send DNS notify");
  }
  return (await response.json()).message as string;
}
