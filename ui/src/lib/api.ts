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
  DnssecPolicy,
  DnssecRolloverRole,
  DnssecStatus,
  EnableDnssecPayload,
  ImportZonePayload,
  ImportZoneResult,
  ListResult,
  PageQuery,
  Pagination,
  Record,
  RecordListQuery,
  RollbackZoneResult,
  SignedRecord,
  TokenGrant,
  TsigGrant,
  TsigKey,
  UpdateDnssecPolicyPayload,
  UpdateDnssecSettingsPayload,
  UpdateRecordPayload,
  UpdateZonePayload,
  VersionDetail,
  VersionDiff,
  Zone,
  ZoneDetail,
  ZoneListQuery,
  ZonePayload,
  ZoneStatus,
  ZoneVersion,
  ZoneVersionListQuery,
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
  appendQueryParam(params, "default_ttl", queryParams.default_ttl);
  appendQueryParam(params, "min_default_ttl", queryParams.min_default_ttl);
  appendQueryParam(params, "max_default_ttl", queryParams.max_default_ttl);
  appendQueryParam(params, "serial", queryParams.serial);

  const response = await apiFetch(
    withQuery("/zones", params),
    "Failed to fetch zones",
  );
  return toListResult((await response.json()) as ListResponse<Zone>);
}

/** Without a limit the server returns every zone. */
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
  zone: UpdateZonePayload,
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

export async function deleteZone(name: string): Promise<string> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(name)}`,
    "Failed to delete zone",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
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

export async function deleteRecord(id: number): Promise<string> {
  const response = await apiFetch(`/records/${id}`, "Failed to delete record", {
    method: "DELETE",
  });
  return (await response.json()).message as string;
}

export async function importZone(
  zoneName: string,
  payload: ImportZonePayload,
): Promise<ImportZoneResult> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/import`,
    "Failed to import zone",
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
    "/records/bulk",
    "Failed to bulk create records",
    {
      method: "POST",
      body: JSON.stringify({ zone_name: zoneName, records, dry_run: dryRun }),
    },
  );
  return (await response.json()) as BulkRecordsResult;
}

export async function getZoneVersionsPage(
  zoneName: string,
  queryParams: ZoneVersionListQuery = {},
): Promise<ListResult<ZoneVersion>> {
  const params = pageParams({
    ...queryParams,
    limit: queryParams.limit ?? 10,
  });
  appendQueryParam(
    params,
    "include_signer_serials",
    queryParams.include_signer_serials || undefined,
  );

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
  serial: number,
  dryRun: boolean,
): Promise<RollbackZoneResult> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/versions/${serial}/rollback?dry_run=${dryRun}`,
    "Failed to roll back zone",
    { method: "POST" },
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

export async function deleteTsigKey(name: string): Promise<string> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(name)}`,
    "Failed to delete TSIG key",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
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
): Promise<string> {
  const response = await apiFetch(
    `/tsig-keys/${encodeURIComponent(keyName)}/grants/${id}`,
    "Failed to revoke the TSIG grant",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
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

/** The calling token's grants; empty for a global token, 401 without auth. */
export async function getSelfTokenGrants(): Promise<TokenGrant[]> {
  const response = await apiFetch(
    `/tokens/self/grants`,
    "Failed to fetch the API token's zone access",
  );
  return (await response.json()).token_grants as TokenGrant[];
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

export async function deleteToken(name: string): Promise<string> {
  const response = await apiFetch(
    `/tokens/${encodeURIComponent(name)}`,
    "Failed to delete API token",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
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
): Promise<string> {
  const response = await apiFetch(
    `/tokens/${encodeURIComponent(tokenName)}/grants/${id}`,
    "Failed to revoke the token grant",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
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

/** Bumping the serial first makes secondaries transfer even when nothing changed. */
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
export async function checkDnssecDs(zoneName: string): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec/check-ds`,
    "Failed to check the parent's DS",
    { method: "POST" },
  );
  return (await response.json()).dnssec as DnssecStatus;
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

export interface DsSeenOptions {
  /** Take the DS on your word instead of asking the parent. */
  skipDsCheck?: boolean;
  /** Promote before the hold-down ends; resolvers caching the old keys fail until it expires. */
  skipHolddown?: boolean;
}

/** Refused during the hold-down or while the parent lacks the new key's DS, unless skipped. */
export async function confirmDnssecDsSeen(
  zoneName: string,
  { skipDsCheck = false, skipHolddown = false }: DsSeenOptions = {},
): Promise<DnssecStatus> {
  const params = new URLSearchParams();
  appendQueryParam(params, "skip_ds_check", skipDsCheck || undefined);
  appendQueryParam(params, "skip_holddown", skipHolddown || undefined);

  const response = await apiFetch(
    withQuery(
      `/zones/${encodeURIComponent(zoneName)}/dnssec/rollover/ds-seen`,
      params,
    ),
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

export async function updateDnssecSettings(
  zoneName: string,
  payload: UpdateDnssecSettingsPayload,
): Promise<DnssecStatus> {
  const response = await apiFetch(
    `/zones/${encodeURIComponent(zoneName)}/dnssec`,
    "Failed to change the zone's DNSSEC settings",
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

export async function deleteDnssecPolicy(name: string): Promise<string> {
  const response = await apiFetch(
    `/dnssec-policies/${encodeURIComponent(name)}`,
    "Failed to delete DNSSEC policy",
    { method: "DELETE" },
  );
  return (await response.json()).message as string;
}
