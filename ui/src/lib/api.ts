import {
  BulkRecordItem,
  BulkRecordsResult,
  CreateRecordPayload,
  CreateTsigKeyPayload,
  CreateZoneTsigPolicyPayload,
  ImportZonePayload,
  ImportZoneResult,
  ListResult,
  NotifyZonePayload,
  PageQuery,
  Pagination,
  Record,
  RecordListQuery,
  RollbackZonePayload,
  RollbackZoneResult,
  SnapshotDetail,
  TsigKey,
  UpdateRecordPayload,
  Zone,
  ZoneDetail,
  ZoneListQuery,
  ZonePayload,
  ZoneSnapshot,
  ZoneStatus,
  ZoneTsigPolicy,
} from "./types";
import { ApiError } from "./errors";
import { getLocalApiHeaders } from "./localApi";

const API_BASE_URL = "/api/bindizr/proxy";

const appendQueryParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined | null,
) => {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, String(value));
  }
};

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

const pageParams = (queryParams: PageQuery) => {
  const params = new URLSearchParams();
  appendQueryParam(params, "limit", queryParams.limit);
  appendQueryParam(params, "offset", queryParams.offset);
  return params;
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
    return { message: fallback };
  }

  try {
    const data = JSON.parse(text) as {
      error?: string;
      message?: string;
      code?: string;
    };
    return { message: data.error || data.message || text, code: data.code };
  } catch {
    return { message: text };
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
    const { message, code } = await parseJsonError(response, fallbackError);
    console.error(`${fallbackError}:`, message);
    throw new ApiError(message, response.status, code);
  }
  return response;
}

async function getZoneListResult(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<Zone>> {
  const params = pageParams(queryParams);
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "name", queryParams.name?.trim());
  appendQueryParam(params, "id", queryParams.id);
  appendQueryParam(params, "primary_ns", queryParams.primary_ns?.trim());
  appendQueryParam(params, "admin_email", queryParams.admin_email?.trim());
  appendQueryParam(params, "ttl", queryParams.ttl);
  appendQueryParam(params, "min_ttl", queryParams.min_ttl);
  appendQueryParam(params, "max_ttl", queryParams.max_ttl);
  appendQueryParam(params, "serial", queryParams.serial);

  const response = await apiFetch(
    withQuery("/zones", params),
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
  const params = pageParams({ ...queryParams, limit: queryParams.limit ?? 10 });
  appendQueryParam(params, "zone_name", queryParams.zone_name);
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "name", queryParams.name?.trim());
  appendQueryParam(params, "record_type", queryParams.record_type);
  appendQueryParam(params, "value", queryParams.value?.trim());
  appendQueryParam(params, "ttl", queryParams.ttl);
  appendQueryParam(params, "min_ttl", queryParams.min_ttl);
  appendQueryParam(params, "max_ttl", queryParams.max_ttl);
  appendQueryParam(params, "priority", queryParams.priority);
  appendQueryParam(params, "min_priority", queryParams.min_priority);
  appendQueryParam(params, "max_priority", queryParams.max_priority);

  const response = await apiFetch(
    withQuery("/records", params),
    "Failed to fetch records",
  );
  return toListResult((await response.json()) as ListResponse<Record>);
}

export async function getRecord(id: number): Promise<Record> {
  const response = await apiFetch(`/records/${id}`, "Failed to fetch record");
  return (await response.json()).record as Record;
}

export async function getZone(
  name: string,
  includeRecords = false,
): Promise<ZoneDetail> {
  const params = new URLSearchParams();
  appendQueryParam(params, "records", includeRecords || undefined);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(name)}`, params),
    "Failed to fetch zone",
  );
  const data = (await response.json()) as ZoneDetail;
  return { zone: data.zone, records: data.records ?? [] };
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
  dryRun = false,
): Promise<BulkRecordsResult> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/records/bulk`,
    "Failed to bulk create records",
    {
      method: "POST",
      body: JSON.stringify({ records, dry_run: dryRun }),
    },
  );
  return (await response.json()) as BulkRecordsResult;
}

export async function getZoneSnapshotsPage(
  zoneName: string,
  queryParams: PageQuery = {},
): Promise<ListResult<ZoneSnapshot>> {
  const params = pageParams({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/snapshots`, params),
    "Failed to fetch zone snapshots",
  );
  return toListResult((await response.json()) as ListResponse<ZoneSnapshot>);
}

export async function getZoneSnapshot(
  zoneName: string,
  serial: number,
): Promise<SnapshotDetail> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/snapshots/${serial}`,
    "Failed to fetch zone snapshot",
  );
  return (await response.json()) as SnapshotDetail;
}

export async function rollbackZone(
  zoneName: string,
  payload: RollbackZonePayload,
): Promise<RollbackZoneResult> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/rollback`,
    "Failed to roll back zone",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()) as RollbackZoneResult;
}

export async function getZoneStatus(zoneName: string): Promise<ZoneStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/status`,
    "Failed to fetch zone status",
  );
  return (await response.json()) as ZoneStatus;
}

export async function getTsigKeys(): Promise<TsigKey[]> {
  const response = await apiFetch(`/tsig-keys`, "Failed to fetch TSIG keys");
  return (await response.json()).tsig_keys as TsigKey[];
}

export async function getTsigKey(name: string): Promise<TsigKey> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to fetch TSIG key",
  );
  return (await response.json()).tsig_key as TsigKey;
}

export async function createTsigKey(
  payload: CreateTsigKeyPayload,
): Promise<TsigKey> {
  const response = await apiFetch(`/tsig-keys`, "Failed to create TSIG key", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()).tsig_key as TsigKey;
}

export async function deleteTsigKey(name: string): Promise<void> {
  await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to delete TSIG key",
    { method: "DELETE" },
  );
}

export async function getZoneTsigPolicies(
  zoneName: string,
): Promise<ZoneTsigPolicy[]> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/tsig-policies`,
    "Failed to fetch zone TSIG policies",
  );
  return (await response.json()).tsig_policies as ZoneTsigPolicy[];
}

export async function createZoneTsigPolicy(
  zoneName: string,
  payload: CreateZoneTsigPolicyPayload,
): Promise<ZoneTsigPolicy> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/tsig-policies`,
    "Failed to create zone TSIG policy",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).tsig_policy as ZoneTsigPolicy;
}

export async function deleteZoneTsigPolicy(
  zoneName: string,
  id: number,
): Promise<void> {
  await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/tsig-policies/${id}`,
    "Failed to delete zone TSIG policy",
    { method: "DELETE" },
  );
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
