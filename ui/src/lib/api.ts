import {
  ApiToken,
  BulkRecordItem,
  BulkRecordsResult,
  CreateDnssecPolicyPayload,
  CreateRecordPayload,
  CreateTokenGrantPayload,
  CreateTokenPayload,
  CreateTsigGrantPayload,
  CreateTsigKeyPayload,
  CreatedToken,
  DnssecDsRecord,
  DnssecPolicy,
  DnssecRolloverRole,
  DnssecStatus,
  EnableDnssecPayload,
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
  SetZoneDnssecPolicyPayload,
  SignedRecord,
  TokenGrant,
  TsigGrant,
  TsigKey,
  UpdateDnssecPolicyPayload,
  UpdateRecordPayload,
  VersionDetail,
  VersionDiff,
  Zone,
  ZoneDetail,
  ZoneListQuery,
  ZonePayload,
  ZoneStatus,
  ZoneVersion,
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
  appendQueryParam(params, "mname", queryParams.mname?.trim());
  appendQueryParam(params, "rname", queryParams.rname?.trim());
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

const recordListParams = (queryParams: RecordListQuery) => {
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
  return params;
};

export async function getRecordsPage(
  queryParams: RecordListQuery = {},
): Promise<ListResult<Record>> {
  const response = await apiFetch(
    withQuery("/records", recordListParams(queryParams)),
    "Failed to fetch records",
  );
  return toListResult((await response.json()) as ListResponse<Record>);
}

/** The signed listing: user records plus derived DNSSEC rows, one pagination. */
export async function getSignedRecordsPage(
  queryParams: RecordListQuery = {},
): Promise<ListResult<SignedRecord>> {
  const params = recordListParams(queryParams);
  appendQueryParam(params, "signed", true);

  const response = await apiFetch(
    withQuery("/records", params),
    "Failed to fetch signed records",
  );
  return toListResult((await response.json()) as ListResponse<SignedRecord>);
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

export async function exportZone(
  zoneName: string,
  signed = false,
): Promise<string> {
  const params = new URLSearchParams();
  appendQueryParam(params, "signed", signed || undefined);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/export`, params),
    "Failed to export zone",
  );
  return response.text();
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

export async function getZoneVersionsPage(
  zoneName: string,
  queryParams: PageQuery = {},
): Promise<ListResult<ZoneVersion>> {
  const params = pageParams({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/versions`, params),
    "Failed to fetch zone versions",
  );
  return toListResult((await response.json()) as ListResponse<ZoneVersion>);
}

export async function getZoneVersion(
  zoneName: string,
  serial: number,
): Promise<VersionDetail> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/versions/${serial}`,
    "Failed to fetch zone version",
  );
  return (await response.json()) as VersionDetail;
}

export async function diffZoneVersions(
  zoneName: string,
  from: number,
  to?: number,
): Promise<VersionDiff> {
  const params = new URLSearchParams();
  appendQueryParam(params, "from", from);
  appendQueryParam(params, "to", to);

  const response = await apiFetch(
    withQuery(`/zones/${encodeURIComponent(zoneName)}/versions/diff`, params),
    "Failed to diff versions",
  );
  return (await response.json()) as VersionDiff;
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

interface TsigKeyEnvelope {
  tsig_key: TsigKey;
  secret: string;
}

/** The create and single-key responses carry the secret beside the key. */
const withSecret = ({ tsig_key, secret }: TsigKeyEnvelope): TsigKey => ({
  ...tsig_key,
  secret,
});

export async function getTsigKey(name: string): Promise<TsigKey> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to fetch TSIG key",
  );
  return withSecret((await response.json()) as TsigKeyEnvelope);
}

export async function createTsigKey(
  payload: CreateTsigKeyPayload,
): Promise<TsigKey> {
  const response = await apiFetch(`/tsig-keys`, "Failed to create TSIG key", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return withSecret((await response.json()) as TsigKeyEnvelope);
}

export async function deleteTsigKey(name: string): Promise<void> {
  await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to delete TSIG key",
    { method: "DELETE" },
  );
}

export async function getTsigGrants(keyName: string): Promise<TsigGrant[]> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(keyName)}/grants`,
    "Failed to fetch TSIG key grants",
  );
  return (await response.json()).tsig_grants as TsigGrant[];
}

export async function createTsigGrant(
  keyName: string,
  payload: CreateTsigGrantPayload,
): Promise<TsigGrant> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(keyName)}/grants`,
    "Failed to grant the TSIG key zone access",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).tsig_grant as TsigGrant;
}

export async function deleteTsigGrant(
  keyName: string,
  id: number,
): Promise<void> {
  await apiFetch(
    `/tsig-keys/${encodeURIComponent(keyName)}/grants/${id}`,
    "Failed to revoke the TSIG grant",
    { method: "DELETE" },
  );
}

/** Read-only: grants are managed on the key. */
export async function getZoneTsigGrants(
  zoneName: string,
): Promise<TsigGrant[]> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/tsig-grants`,
    "Failed to fetch the zone's TSIG grants",
  );
  return (await response.json()).tsig_grants as TsigGrant[];
}

export async function getTokens(): Promise<ApiToken[]> {
  const response = await apiFetch(`/tokens`, "Failed to fetch API tokens");
  return (await response.json()).tokens as ApiToken[];
}

/** The calling token; 401 when Bindizr runs without auth. */
export async function getSelfToken(): Promise<ApiToken> {
  const response = await apiFetch(
    `/tokens/self`,
    "Failed to describe the API token",
  );
  return (await response.json()).token as ApiToken;
}

/** The secret is returned this once. */
export async function createToken(
  payload: CreateTokenPayload,
): Promise<CreatedToken> {
  const response = await apiFetch(`/tokens`, "Failed to create API token", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await response.json()) as CreatedToken;
}

export async function deleteToken(name: string): Promise<void> {
  await apiFetch(
    `/tokens/${encodeURIComponent(name)}`,
    "Failed to delete API token",
    { method: "DELETE" },
  );
}

export async function getTokenGrants(tokenName: string): Promise<TokenGrant[]> {
  const response = await apiFetch(
    `/tokens/${encodeURIComponent(tokenName)}/grants`,
    "Failed to fetch API token grants",
  );
  return (await response.json()).token_grants as TokenGrant[];
}

export async function createTokenGrant(
  tokenName: string,
  payload: CreateTokenGrantPayload,
): Promise<TokenGrant> {
  const response = await apiFetch(
    `/tokens/${encodeURIComponent(tokenName)}/grants`,
    "Failed to grant the API token zone access",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).token_grant as TokenGrant;
}

export async function deleteTokenGrant(
  tokenName: string,
  id: number,
): Promise<void> {
  await apiFetch(
    `/tokens/${encodeURIComponent(tokenName)}/grants/${id}`,
    "Failed to revoke the token grant",
    { method: "DELETE" },
  );
}

/** Read-only: grants are managed on the token. */
export async function getZoneTokenGrants(
  zoneName: string,
): Promise<TokenGrant[]> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/token-grants`,
    "Failed to fetch the zone's token grants",
  );
  return (await response.json()).token_grants as TokenGrant[];
}

export async function notifyZones(
  zoneName?: string | null,
  bumpSerial = false,
): Promise<string> {
  const body: NotifyZonePayload = {
    bump_serial: bumpSerial,
    zone_name: zoneName ?? null,
  };

  const response = await apiFetch(
    `/zones/notify`,
    "Failed to send DNS notify",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
  return (await response.json()).message as string;
}

export async function getDnssecStatus(zoneName: string): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to fetch DNSSEC status",
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function enableDnssec(
  zoneName: string,
  payload: EnableDnssecPayload = {},
): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to enable DNSSEC",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function disableDnssec(zoneName: string): Promise<string> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to disable DNSSEC",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}

export async function getDnssecDsRecords(
  zoneName: string,
): Promise<DnssecDsRecord[]> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/ds`,
    "Failed to fetch DS records",
  );
  return (await response.json()).ds_records as DnssecDsRecord[];
}

export async function startDnssecRollover(
  zoneName: string,
  role?: DnssecRolloverRole,
): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/rollover`,
    "Failed to start key rollover",
    {
      method: "POST",
      body: JSON.stringify({ role: role ?? null }),
    },
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function confirmDnssecDsSeen(
  zoneName: string,
): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/rollover/ds-seen`,
    "Failed to confirm DS seen",
    { method: "POST" },
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function signDnssecZone(zoneName: string): Promise<string> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/sign`,
    "Failed to re-sign zone",
    { method: "POST" },
  );
  return (await response.json()).message as string;
}

export async function setZoneDnssecPolicy(
  zoneName: string,
  payload: SetZoneDnssecPolicyPayload,
): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/policy`,
    "Failed to change the zone's DNSSEC policy",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function withdrawDnssec(zoneName: string): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/withdraw`,
    "Failed to publish the DS withdrawal",
    { method: "POST" },
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function cancelDnssecWithdrawal(
  zoneName: string,
): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/withdraw`,
    "Failed to cancel the DS withdrawal",
    { method: "DELETE" },
  );
  return (await response.json()).dnssec as DnssecStatus;
}

export async function getDnssecPolicies(): Promise<DnssecPolicy[]> {
  const response = await apiFetch(
    `/dnssec-policies`,
    "Failed to fetch DNSSEC policies",
  );
  return (await response.json()).dnssec_policies as DnssecPolicy[];
}

export async function getDnssecPolicy(name: string): Promise<DnssecPolicy> {
  const response = await apiFetch(
    `/dnssec-policies/${encodeURIComponent(name)}`,
    "Failed to fetch DNSSEC policy",
  );
  return (await response.json()).dnssec_policy as DnssecPolicy;
}

export async function createDnssecPolicy(
  payload: CreateDnssecPolicyPayload,
): Promise<DnssecPolicy> {
  const response = await apiFetch(
    `/dnssec-policies`,
    "Failed to create DNSSEC policy",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).dnssec_policy as DnssecPolicy;
}

export async function updateDnssecPolicy(
  name: string,
  payload: UpdateDnssecPolicyPayload,
): Promise<DnssecPolicy> {
  const response = await apiFetch(
    `/dnssec-policies/${encodeURIComponent(name)}`,
    "Failed to update DNSSEC policy",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()).dnssec_policy as DnssecPolicy;
}

export async function deleteDnssecPolicy(name: string): Promise<void> {
  await apiFetch(
    `/dnssec-policies/${encodeURIComponent(name)}`,
    "Failed to delete DNSSEC policy",
    { method: "DELETE" },
  );
}
