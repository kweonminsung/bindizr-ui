import {
  BulkRecordItem,
  BulkRecordsResult,
  CreateRecordPayload,
  ImportZonePayload,
  ImportZoneResult,
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

async function apiFetch(
  path: string,
  fallbackError: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: getLocalApiHeaders(),
  });
  if (!response.ok) {
    const errorText = await parseJsonError(response, fallbackError);
    console.error(`${fallbackError}:`, errorText);
    throw new Error(errorText);
  }
  return response;
}

async function getZoneListResult(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<Zone>> {
  const params = new URLSearchParams();
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "limit", queryParams.limit);
  appendQueryParam(params, "offset", queryParams.offset);

  const query = params.toString();
  const response = await apiFetch(
    `/zones${query ? `?${query}` : ""}`,
    "Failed to fetch zones",
  );
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

export async function getRecordsPage(
  queryParams: RecordListQuery = {},
): Promise<ListResult<Record>> {
  const params = new URLSearchParams();
  appendQueryParam(params, "zone_name", queryParams.zone_name);
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "record_type", queryParams.record_type);
  appendQueryParam(params, "limit", queryParams.limit ?? 10);
  appendQueryParam(params, "offset", queryParams.offset);

  const query = params.toString();
  const response = await apiFetch(
    `/records${query ? `?${query}` : ""}`,
    "Failed to fetch records",
  );
  return toListResult((await response.json()) as ListResponse<Record>);
}

export async function createZone(zone: ZonePayload): Promise<Zone> {
  const response = await apiFetch(`/zones`, "Failed to create zone", {
    method: "POST",
    body: JSON.stringify(zone),
  });
  return (await response.json()).zone as Zone;
}

export async function createRecord(
  record: CreateRecordPayload,
): Promise<Record> {
  const response = await apiFetch(`/records`, "Failed to create record", {
    method: "POST",
    body: JSON.stringify(record),
  });
  return (await response.json()).record as Record;
}

export async function updateZone(
  name: string,
  zone: ZonePayload,
): Promise<Zone> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(name)}`,
    "Failed to update zone",
    {
      method: "PUT",
      body: JSON.stringify(zone),
    },
  );
  return (await response.json()).zone as Zone;
}

export async function deleteZone(name: string): Promise<void> {
  await apiFetch(
    `/zones/${encodeURIComponent(name)}`,
    "Failed to delete zone",
    { method: "DELETE" },
  );
}

export async function updateRecord(
  id: number,
  record: UpdateRecordPayload,
): Promise<Record> {
  const response = await apiFetch(`/records/${id}`, "Failed to update record", {
    method: "PUT",
    body: JSON.stringify(record),
  });
  return (await response.json()).record as Record;
}

export async function deleteRecord(id: number): Promise<void> {
  await apiFetch(`/records/${id}`, "Failed to delete record", {
    method: "DELETE",
  });
}

export async function importZoneFile(
  zoneName: string,
  payload: ImportZonePayload,
): Promise<ImportZoneResult> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/imports`,
    "Failed to import zone file",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()) as ImportZoneResult;
}

export async function createRecordsBulk(
  zoneName: string,
  records: BulkRecordItem[],
): Promise<BulkRecordsResult> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/records/bulk`,
    "Failed to bulk create records",
    {
      method: "POST",
      body: JSON.stringify({ records }),
    },
  );
  return (await response.json()) as BulkRecordsResult;
}

export async function notifyZones(
  zoneName?: string | null,
  force = false,
): Promise<string> {
  const body: NotifyZonePayload = {
    force,
    zone_name: zoneName ?? null,
  };

  const response = await apiFetch(
    `/notify/zones`,
    "Failed to send DNS notify",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return (await response.json()).message as string;
}
