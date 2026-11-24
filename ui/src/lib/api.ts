import {
  AccessLogResponse,
  AccessLogListQuery,
  ActivityLog,
  ActivityLogListQuery,
  ApiTokenResponse,
  CreateDnssecPolicyRequest,
  CreateApiTokenResponse,
  CreateRecordRequest,
  CreateRoleGrantRequest,
  CreateRoleRequest,
  CreateSecondaryRequest,
  CreateApiTokenRequest,
  CreateTsigKeyRequest,
  DeleteRecordsResponse,
  DeleteZoneResponse,
  DnssecPolicyResponse,
  DnssecRolloverRole,
  DnssecStatusResponse,
  EnableDnssecRequest,
  ImportZoneRequest,
  ImportZoneResponse,
  ImportZonesRequest,
  ImportZonesResponse,
  ListResult,
  PageQuery,
  PaginationResponse,
  PermissionsResponse,
  Record,
  RecordListQuery,
  WriteRecordResponse,
  StoredZoneResponse,
  RoleResponse,
  RoleGrantResponse,
  RollbackZoneResponse,
  SecondaryResponse,
  CheckSecondaryResponse,
  RecordResponse,
  TransferLogResponse,
  TransferLogListQuery,
  TsigKeyResponse,
  SingleTsigKeyResponse,
  TsigKeyWithSecret,
  UpdateDnssecPolicyRequest,
  UpdateDnssecSettingsRequest,
  UpdateRecordRequest,
  UpdateSecondaryRequest,
  UpdateZoneRequest,
  GetZoneVersionResponse,
  DiffZoneVersionsResponse,
  ZoneResponse,
  ZoneListQuery,
  CreateZoneRequest,
  ZoneStatusResponse,
  ZoneVersionResponse,
  ZoneVersionListQuery,
  WriteZoneResponse,
} from "./types";
import { ApiError, readResponseError } from "./errors";
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

interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationResponse;
}

interface ActivityLogResponse extends PaginatedResponse<ActivityLog> {
  operations: string[];
}

/** The most one call returns; the HTTP API refuses more. */
const MAX_PAGE_LIMIT = 1000;

/** The `role_name` filter the token and key listings take. */
const roleFilterParams = (roleName?: string) =>
  new URLSearchParams(roleName ? { role_name: roleName } : {});

/** Read a full listing as bounded pages until its reported total is in hand. */
async function getAllItems<T>(
  path: string,
  fallbackError: string,
  baseParams: URLSearchParams = new URLSearchParams(),
): Promise<T[]> {
  const items: T[] = [];

  for (;;) {
    const params = new URLSearchParams(baseParams);
    params.set("limit", String(MAX_PAGE_LIMIT));
    params.set("offset", String(items.length));

    const response = await apiFetch(withQuery(path, params), fallbackError);
    const page = (await response.json()) as PaginatedResponse<T>;
    items.push(...page.items);

    // An empty page ends it too, so a shrinking total cannot spin.
    if (page.items.length === 0 || items.length >= page.pagination.total) {
      return items;
    }
  }
}

const toListResult = <T>(response: PaginatedResponse<T>): ListResult<T> => ({
  items: response.items,
  pagination: response.pagination,
  hasNext:
    response.pagination.offset + response.items.length <
    response.pagination.total,
});

async function apiFetch(
  path: string,
  fallbackError: string,
  init: RequestInit = {},
  /** Statuses whose body the caller reads itself instead of an error throwing. */
  passThroughStatuses: number[] = [],
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: getLocalApiHeaders(),
  });
  if (!response.ok && !passThroughStatuses.includes(response.status)) {
    const { message, code } = await readResponseError(response, fallbackError);
    throw new ApiError(message, response.status, code);
  }
  return response;
}

const zoneListParams = (queryParams: ZoneListQuery) => {
  const params = pageParams(queryParams);
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "name", queryParams.name?.trim());
  appendQueryParam(params, "id", queryParams.id);
  appendQueryParam(params, "mname", queryParams.mname?.trim());
  appendQueryParam(params, "rname", queryParams.rname?.trim());
  appendQueryParam(params, "default_ttl", queryParams.default_ttl);
  appendQueryParam(params, "min_default_ttl", queryParams.min_default_ttl);
  appendQueryParam(params, "max_default_ttl", queryParams.max_default_ttl);
  appendQueryParam(params, "serial", queryParams.serial);
  appendQueryParam(params, "enabled", queryParams.enabled);
  appendQueryParam(params, "dnssec_enabled", queryParams.dnssec_enabled);
  appendQueryParam(params, "min_serial", queryParams.min_serial);
  appendQueryParam(params, "max_serial", queryParams.max_serial);
  appendQueryParam(params, "since", queryParams.since);
  appendQueryParam(params, "until", queryParams.until);
  appendQueryParam(params, "sort", queryParams.sort);
  appendQueryParam(params, "order", queryParams.order);
  return params;
};

async function getZoneListResult(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<StoredZoneResponse>> {
  const response = await apiFetch(
    withQuery("/zones", zoneListParams(queryParams)),
    "Failed to fetch zones",
  );
  return toListResult(
    (await response.json()) as PaginatedResponse<StoredZoneResponse>,
  );
}

/** All zones the token may see; the paging is this call's, so it takes
 * filters alone. */
export async function getZones(
  queryParams: Omit<ZoneListQuery, keyof PageQuery> = {},
): Promise<StoredZoneResponse[]> {
  return getAllItems<StoredZoneResponse>(
    "/zones",
    "Failed to fetch zones",
    zoneListParams(queryParams),
  );
}

export async function getZonesPage(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<StoredZoneResponse>> {
  return getZoneListResult({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });
}

const recordListParams = (queryParams: RecordListQuery) => {
  const params = pageParams({ ...queryParams, limit: queryParams.limit ?? 10 });
  appendQueryParam(params, "zone_name", queryParams.zone_name);
  appendQueryParam(params, "search", queryParams.search?.trim());
  appendQueryParam(params, "name", queryParams.name?.trim());
  appendQueryParam(params, "type", queryParams.type);
  appendQueryParam(params, "value", queryParams.value?.trim());
  appendQueryParam(params, "ttl", queryParams.ttl);
  appendQueryParam(params, "min_ttl", queryParams.min_ttl);
  appendQueryParam(params, "max_ttl", queryParams.max_ttl);
  appendQueryParam(params, "priority", queryParams.priority);
  appendQueryParam(params, "min_priority", queryParams.min_priority);
  appendQueryParam(params, "max_priority", queryParams.max_priority);
  appendQueryParam(params, "sort", queryParams.sort);
  appendQueryParam(params, "order", queryParams.order);
  appendQueryParam(params, "include_dnssec", queryParams.include_dnssec);
  return params;
};

export async function getRecordsPage(
  queryParams: Omit<RecordListQuery, "include_dnssec"> = {},
): Promise<ListResult<Record>> {
  const response = await apiFetch(
    withQuery("/records", recordListParams(queryParams)),
    "Failed to fetch records",
  );
  return toListResult((await response.json()) as PaginatedResponse<Record>);
}

/** List user records together with generated DNSSEC records. */
export async function getRecordsWithDnssecPage(
  queryParams: Omit<RecordListQuery, "include_dnssec"> = {},
): Promise<ListResult<RecordResponse>> {
  const params = recordListParams({ ...queryParams, include_dnssec: true });

  const response = await apiFetch(
    withQuery("/records", params),
    "Failed to fetch records with DNSSEC",
  );
  return toListResult(
    (await response.json()) as PaginatedResponse<RecordResponse>,
  );
}

/** The zone's SOA metadata alone; its records are a `getRecordsPage` call. */
export async function getZone(name: string): Promise<ZoneResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(name)}`,
    "Failed to fetch zone",
  );
  return (await response.json()).zone as ZoneResponse;
}

export async function createZone(
  zone: CreateZoneRequest,
): Promise<ZoneResponse> {
  const response = await apiFetch(`/zones`, "Failed to create zone", {
    method: "POST",
    body: JSON.stringify(zone),
  });
  return ((await response.json()) as WriteZoneResponse).zone;
}

export async function createRecord(
  record: CreateRecordRequest,
): Promise<Record> {
  const response = await apiFetch(`/records`, "Failed to create record", {
    method: "POST",
    body: JSON.stringify(record),
  });
  // An applied write carries the id only a dry run would have left out.
  return ((await response.json()) as WriteRecordResponse).record as Record;
}

export async function updateZone(
  name: string,
  zone: UpdateZoneRequest,
): Promise<ZoneResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(name)}`,
    "Failed to update zone",
    {
      method: "PUT",
      body: JSON.stringify(zone),
    },
  );
  return ((await response.json()) as WriteZoneResponse).zone;
}

/** What went: the zone, and the records and versions it took. A dry run
 * reports the counts and removes nothing. */
export async function deleteZone(
  name: string,
  dryRun = false,
): Promise<DeleteZoneResponse> {
  const params = new URLSearchParams();
  appendQueryParam(params, "dry_run", dryRun || undefined);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(name)}`, params),
    "Failed to delete zone",
    { method: "DELETE" },
  );
  return (await response.json()) as DeleteZoneResponse;
}

export async function updateRecord(
  id: number,
  record: UpdateRecordRequest,
): Promise<Record> {
  const response = await apiFetch(`/records/${id}`, "Failed to update record", {
    method: "PUT",
    body: JSON.stringify(record),
  });
  return ((await response.json()) as WriteRecordResponse).record as Record;
}

export async function deleteRecord(id: number): Promise<DeleteRecordsResponse> {
  const response = await apiFetch(`/records/${id}`, "Failed to delete record", {
    method: "DELETE",
  });
  return (await response.json()) as DeleteRecordsResponse;
}

export async function importZone(
  zoneName: string,
  payload: ImportZoneRequest,
): Promise<ImportZoneResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/import`,
    "Failed to import zone",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    [422],
  );
  return (await response.json()) as ImportZoneResponse;
}

/** Several zones from one server, each imported on its own; the answer
 * carries every zone's outcome, so only a malformed request throws. */
export async function importZones(
  payload: ImportZonesRequest,
): Promise<ImportZonesResponse> {
  const response = await apiFetch("/import", "Failed to import zones", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()) as ImportZonesResponse;
}

export async function exportZone(
  zoneName: string,
  includeDnssec = false,
): Promise<string> {
  const params = new URLSearchParams();
  appendQueryParam(params, "include_dnssec", includeDnssec || undefined);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/export`, params),
    "Failed to export zone",
  );
  return response.text();
}

export async function getZoneVersionsPage(
  zoneName: string,
  queryParams: ZoneVersionListQuery = {},
): Promise<ListResult<ZoneVersionResponse>> {
  const params = pageParams({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });
  appendQueryParam(
    params,
    "include_signer_only_versions",
    queryParams.include_signer_only_versions || undefined,
  );

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/versions`, params),
    "Failed to fetch zone versions",
  );
  return toListResult(
    (await response.json()) as PaginatedResponse<ZoneVersionResponse>,
  );
}

/** The activity log, newest first; needs `log:read` in all zones. */
export async function getActivityLogPage(
  queryParams: ActivityLogListQuery = {},
  signal?: AbortSignal,
): Promise<ListResult<ActivityLog> & { operations: string[] }> {
  const params = pageParams({ ...queryParams, limit: queryParams.limit ?? 10 });
  appendQueryParam(params, "entity", queryParams.entity?.trim());
  appendQueryParam(params, "operation", queryParams.operation?.trim());
  appendQueryParam(params, "result", queryParams.result);
  appendQueryParam(params, "name", queryParams.name?.trim());
  appendQueryParam(params, "zone_name", queryParams.zone_name?.trim());
  appendQueryParam(params, "record_name", queryParams.record_name?.trim());
  appendQueryParam(params, "record_type", queryParams.record_type?.trim());
  appendQueryParam(params, "since", queryParams.since);
  appendQueryParam(params, "until", queryParams.until);
  appendQueryParam(params, "sort", queryParams.sort);
  appendQueryParam(params, "order", queryParams.order);

  const response = await apiFetch(
    withQuery("/logs/activity", params),
    "Failed to fetch the activity log",
    { signal },
  );
  const page = (await response.json()) as ActivityLogResponse;
  return { ...toListResult(page), operations: page.operations };
}

/** The access log, newest first; needs `log:read` in all zones. */
export async function getAccessLogPage(
  queryParams: AccessLogListQuery = {},
): Promise<ListResult<AccessLogResponse>> {
  const params = pageParams({ ...queryParams, limit: queryParams.limit ?? 10 });
  appendQueryParam(params, "source", queryParams.source);
  appendQueryParam(params, "result", queryParams.result);
  appendQueryParam(params, "actor_name", queryParams.actor_name?.trim());
  appendQueryParam(params, "client_ip", queryParams.client_ip?.trim());
  appendQueryParam(params, "since", queryParams.since);
  appendQueryParam(params, "until", queryParams.until);
  appendQueryParam(params, "sort", queryParams.sort);
  appendQueryParam(params, "order", queryParams.order);

  const response = await apiFetch(
    withQuery("/logs/access", params),
    "Failed to fetch the access log",
  );
  return toListResult(
    (await response.json()) as PaginatedResponse<AccessLogResponse>,
  );
}

/** The transfer log, newest first; needs `log:read` in all zones. */
export async function getTransferLogPage(
  queryParams: TransferLogListQuery = {},
): Promise<ListResult<TransferLogResponse>> {
  const params = pageParams({ ...queryParams, limit: queryParams.limit ?? 10 });
  appendQueryParam(params, "secondary_name", queryParams.secondary_name);
  appendQueryParam(params, "client_ip", queryParams.client_ip?.trim());
  appendQueryParam(params, "zone_name", queryParams.zone_name?.trim());
  appendQueryParam(params, "result", queryParams.result);
  appendQueryParam(params, "since", queryParams.since);
  appendQueryParam(params, "until", queryParams.until);
  appendQueryParam(params, "sort", queryParams.sort);
  appendQueryParam(params, "order", queryParams.order);

  const response = await apiFetch(
    withQuery("/logs/transfer", params),
    "Failed to fetch the transfer log",
  );
  return toListResult(
    (await response.json()) as PaginatedResponse<TransferLogResponse>,
  );
}

export async function getZoneVersion(
  zoneName: string,
  serial: number,
): Promise<GetZoneVersionResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/versions/${serial}`,
    "Failed to fetch zone version",
  );
  return (await response.json()) as GetZoneVersionResponse;
}

export async function diffZoneVersions(
  zoneName: string,
  fromSerial: number,
  toSerial?: number,
): Promise<DiffZoneVersionsResponse> {
  const params = new URLSearchParams();
  appendQueryParam(params, "from_serial", fromSerial);
  appendQueryParam(params, "to_serial", toSerial);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/versions/diff`, params),
    "Failed to diff versions",
  );
  return (await response.json()) as DiffZoneVersionsResponse;
}

export async function rollbackZone(
  zoneName: string,
  serial: number,
  dryRun: boolean,
): Promise<RollbackZoneResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/versions/${serial}/rollback?dry_run=${dryRun}`,
    "Failed to roll back zone",
    { method: "POST" },
  );
  return (await response.json()) as RollbackZoneResponse;
}

export async function getZoneStatus(
  zoneName: string,
): Promise<ZoneStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/status`,
    "Failed to fetch zone status",
  );
  return (await response.json()) as ZoneStatusResponse;
}

export async function getSecondaries(): Promise<SecondaryResponse[]> {
  return getAllItems<SecondaryResponse>(
    "/secondaries",
    "Failed to fetch secondaries",
  );
}

export async function createSecondary(
  payload: CreateSecondaryRequest,
): Promise<SecondaryResponse> {
  const response = await apiFetch(
    `/secondaries`,
    "Failed to register secondary",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).secondary as SecondaryResponse;
}

export async function updateSecondary(
  name: string,
  payload: UpdateSecondaryRequest,
): Promise<SecondaryResponse> {
  const response = await apiFetch(
    `/secondaries/${encodeURIComponent(name)}`,
    "Failed to update secondary",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).secondary as SecondaryResponse;
}

export async function checkSecondary(
  name: string,
): Promise<CheckSecondaryResponse> {
  const response = await apiFetch(
    `/secondaries/${encodeURIComponent(name)}/check`,
    "Failed to check secondary",
    { method: "POST" },
  );
  return (await response.json()) as CheckSecondaryResponse;
}

export async function deleteSecondary(name: string): Promise<string> {
  const response = await apiFetch(
    `/secondaries/${encodeURIComponent(name)}`,
    "Failed to delete secondary",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

/** Every TSIG key, or only those in `roleName`. */
export async function getTsigKeys(
  roleName?: string,
): Promise<TsigKeyResponse[]> {
  return getAllItems<TsigKeyResponse>(
    "/tsig-keys",
    "Failed to fetch TSIG keys",
    roleFilterParams(roleName),
  );
}

const withSecret = ({
  tsig_key,
  secret,
}: SingleTsigKeyResponse): TsigKeyWithSecret => ({
  ...tsig_key,
  secret,
});

export async function getTsigKey(name: string): Promise<TsigKeyWithSecret> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to fetch TSIG key",
  );
  return withSecret((await response.json()) as SingleTsigKeyResponse);
}

export async function createTsigKey(
  payload: CreateTsigKeyRequest,
): Promise<TsigKeyWithSecret> {
  const response = await apiFetch(`/tsig-keys`, "Failed to create TSIG key", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return withSecret((await response.json()) as SingleTsigKeyResponse);
}

export async function deleteTsigKey(name: string): Promise<string> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to delete TSIG key",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

/** Every API token, or only those in `roleName`. */
export async function getTokens(
  roleName?: string,
): Promise<ApiTokenResponse[]> {
  return getAllItems<ApiTokenResponse>(
    "/tokens",
    "Failed to fetch API tokens",
    roleFilterParams(roleName),
  );
}

/** The calling token; 404 when Bindizr runs without auth. */
export async function getSelfToken(): Promise<ApiTokenResponse> {
  const response = await apiFetch(
    `/tokens/self`,
    "Failed to describe the API token",
  );
  return (await response.json()).token as ApiTokenResponse;
}

/** What the caller may do, computed by Bindizr from its role's grants. */
export async function getPermissions(): Promise<PermissionsResponse> {
  const response = await apiFetch(
    `/permissions`,
    "Failed to fetch permissions",
  );
  return (await response.json()) as PermissionsResponse;
}

/** The grants of the calling token's role; 404 without auth. */
export async function getSelfTokenGrants(): Promise<RoleGrantResponse[]> {
  return getAllItems<RoleGrantResponse>(
    `/tokens/self/grants`,
    "Failed to fetch the API token's zone access",
  );
}

/** The secret is returned this once. */
export async function createToken(
  payload: CreateApiTokenRequest,
): Promise<CreateApiTokenResponse> {
  const response = await apiFetch(`/tokens`, "Failed to create API token", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()) as CreateApiTokenResponse;
}

export async function deleteToken(name: string): Promise<string> {
  const response = await apiFetch(
    `/tokens/${encodeURIComponent(name)}`,
    "Failed to delete API token",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

export async function getRoles(): Promise<RoleResponse[]> {
  return getAllItems<RoleResponse>("/roles", "Failed to fetch roles");
}

/** One role with its grant, token, and key counts. */
export async function getRole(name: string): Promise<RoleResponse> {
  const response = await apiFetch(
    `/roles/${encodeURIComponent(name)}`,
    "Failed to fetch role",
  );
  return (await response.json()).role as RoleResponse;
}

export async function createRole(
  payload: CreateRoleRequest,
): Promise<RoleResponse> {
  const response = await apiFetch(`/roles`, "Failed to create role", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()).role as RoleResponse;
}

/** Refused for the built-in role and while a token or key holds it. */
export async function deleteRole(name: string): Promise<string> {
  const response = await apiFetch(
    `/roles/${encodeURIComponent(name)}`,
    "Failed to delete role",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

export async function getRoleGrants(
  roleName: string,
): Promise<RoleGrantResponse[]> {
  return getAllItems<RoleGrantResponse>(
    `/roles/${encodeURIComponent(roleName)}/grants`,
    "Failed to fetch role grants",
  );
}

export async function createRoleGrant(
  roleName: string,
  payload: CreateRoleGrantRequest,
): Promise<RoleGrantResponse> {
  const response = await apiFetch(
    `/roles/${encodeURIComponent(roleName)}/grants`,
    "Failed to add a grant to this role",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).role_grant as RoleGrantResponse;
}

export async function deleteRoleGrant(
  roleName: string,
  id: number,
): Promise<string> {
  const response = await apiFetch(
    `/roles/${encodeURIComponent(roleName)}/grants/${id}`,
    "Failed to revoke the role grant",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

/** Optional serial bumps can commit before the NOTIFY request completes. */
export async function notifyZones(
  zoneName?: string | null,
  bumpSerial = false,
): Promise<string> {
  const path = zoneName
    ? `/zones/${encodeURIComponent(zoneName)}/notify`
    : "/notify";
  const response = await apiFetch(
    `${path}?bump_serial=${bumpSerial}`,
    "Failed to send DNS notify",
    { method: "POST" },
  );
  return (await response.json()).message as string;
}

export async function getDnssecStatus(
  zoneName: string,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to fetch DNSSEC status",
  );
  return (await response.json()) as DnssecStatusResponse;
}

export async function enableDnssec(
  zoneName: string,
  payload: EnableDnssecRequest,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to enable DNSSEC",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()) as DnssecStatusResponse;
}

/** Refused while the parent still serves a DS unless the check is skipped. */
export async function disableDnssec(
  zoneName: string,
  skipDsCheck = false,
): Promise<string> {
  const params = new URLSearchParams();
  appendQueryParam(params, "skip_ds_check", skipDsCheck || undefined);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/dnssec`, params),
    "Failed to disable DNSSEC",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

/** Asks the parent's nameservers for the zone's DS; the answer is in `delegation`. */
export async function checkDnssecDs(
  zoneName: string,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/check-ds`,
    "Failed to check the parent's DS",
    { method: "POST" },
  );
  return (await response.json()) as DnssecStatusResponse;
}

export async function startDnssecRollover(
  zoneName: string,
  role?: DnssecRolloverRole,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/rollover`,
    "Failed to start key rollover",
    {
      method: "POST",
      body: JSON.stringify({ role: role ?? null }),
    },
  );
  return (await response.json()) as DnssecStatusResponse;
}

export interface AdvanceDnssecRolloverOptions {
  /** Take the DS on your word instead of asking the parent. */
  skipDsCheck?: boolean;
  /** Promote before the hold-down ends; resolvers caching the old keys fail until it expires. */
  skipHolddown?: boolean;
}

/** Refused during the hold-down or while the parent lacks the new key's DS, unless skipped. */
export async function advanceDnssecRollover(
  zoneName: string,
  {
    skipDsCheck = false,
    skipHolddown = false,
  }: AdvanceDnssecRolloverOptions = {},
): Promise<DnssecStatusResponse> {
  const params = new URLSearchParams();
  appendQueryParam(params, "skip_ds_check", skipDsCheck || undefined);
  appendQueryParam(params, "skip_holddown", skipHolddown || undefined);

  const response = await apiFetch(
    withQuery(
      `/zones/${encodeURIComponent(zoneName)}/dnssec/rollover/advance`,
      params,
    ),
    "Failed to advance DNSSEC rollover",
    { method: "POST" },
  );
  return (await response.json()) as DnssecStatusResponse;
}

export async function signDnssecZone(zoneName: string): Promise<string> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/sign`,
    "Failed to re-sign zone",
    { method: "POST" },
  );
  return (await response.json()).message as string;
}

export async function updateDnssecSettings(
  zoneName: string,
  payload: UpdateDnssecSettingsRequest,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to change the zone's DNSSEC settings",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()) as DnssecStatusResponse;
}

export async function withdrawDnssec(
  zoneName: string,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/withdraw`,
    "Failed to publish the DS withdrawal",
    { method: "POST" },
  );
  return (await response.json()) as DnssecStatusResponse;
}

export async function cancelDnssecWithdrawal(
  zoneName: string,
): Promise<DnssecStatusResponse> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/withdraw`,
    "Failed to cancel the DS withdrawal",
    { method: "DELETE" },
  );
  return (await response.json()) as DnssecStatusResponse;
}

export async function getDnssecPolicies(): Promise<DnssecPolicyResponse[]> {
  return getAllItems<DnssecPolicyResponse>(
    "/dnssec-policies",
    "Failed to fetch DNSSEC policies",
  );
}

export async function createDnssecPolicy(
  payload: CreateDnssecPolicyRequest,
): Promise<DnssecPolicyResponse> {
  const response = await apiFetch(
    `/dnssec-policies`,
    "Failed to create DNSSEC policy",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).dnssec_policy as DnssecPolicyResponse;
}

export async function updateDnssecPolicy(
  name: string,
  payload: UpdateDnssecPolicyRequest,
): Promise<DnssecPolicyResponse> {
  const response = await apiFetch(
    `/dnssec-policies/${encodeURIComponent(name)}`,
    "Failed to update DNSSEC policy",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).dnssec_policy as DnssecPolicyResponse;
}

export async function deleteDnssecPolicy(name: string): Promise<string> {
  const response = await apiFetch(
    `/dnssec-policies/${encodeURIComponent(name)}`,
    "Failed to delete DNSSEC policy",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}
