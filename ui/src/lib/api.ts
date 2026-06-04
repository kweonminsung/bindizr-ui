import {
  CreateRecordPayload,
  ListResult,
  NotifyZonePayload,
  Record,
  RecordListQuery,
  UpdateRecordPayload,
  Zone,
  ZoneListQuery,
  ZonePayload,
} from "./types";

let API_BASE_URL: string | null = null;
let SECRET_KEY: string | null = null;

async function getConfig() {
  if (API_BASE_URL) {
    return { API_BASE_URL, SECRET_KEY };
  }

  const token = localStorage.getItem("auth_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch("/api/bindizr", {
    headers,
  });
  const config = await res.json();

  API_BASE_URL = config.bindizrUrl;
  SECRET_KEY = config.secretKey;

  return { API_BASE_URL, SECRET_KEY };
}

const getHeaders = async () => {
  const { SECRET_KEY } = await getConfig();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (SECRET_KEY) {
    headers["Authorization"] = `Bearer ${SECRET_KEY}`;
  }
  return headers;
};

const appendQueryParam = (
  params: URLSearchParams,
  key: string,
  value: string | number | undefined | null,
) => {
  if (value !== undefined && value !== null && value !== "") {
    params.set(key, String(value));
  }
};

const toListResult = <T>(items: T[], limit: number): ListResult<T> => ({
  items: items.slice(0, limit),
  hasNext: items.length > limit,
});

export async function getZones(
  queryParams: ZoneListQuery = {},
): Promise<Zone[]> {
  const { API_BASE_URL } = await getConfig();

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
    const errorText = await parseJsonError(response, "Failed to fetch zones");
    console.error("Failed to fetch zones:", errorText);
    throw new Error("Failed to fetch zones");
  }
  return (await response.json()).zones as Zone[];
}

export async function getZonesPage(
  queryParams: ZoneListQuery = {},
): Promise<ListResult<Zone>> {
  const limit = queryParams.limit ?? 10;
  const zones = await getZones({
    ...queryParams,
    limit: limit + 1,
  });

  return toListResult(zones, limit);
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

export async function getRecords(
  queryParams: RecordListQuery = {},
): Promise<Record[]> {
  const { API_BASE_URL } = await getConfig();

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
    const errorText = await parseJsonError(response, "Failed to fetch records");
    console.error("Failed to fetch records:", errorText);
    throw new Error("Failed to fetch records");
  }
  return (await response.json()).records as Record[];
}

export async function getRecordsPage(
  queryParams: RecordListQuery = {},
): Promise<ListResult<Record>> {
  const limit = queryParams.limit ?? 10;
  const records = await getRecords({
    ...queryParams,
    limit: limit + 1,
  });

  return toListResult(records, limit);
}

export async function createZone(zone: ZonePayload): Promise<Zone> {
  const { API_BASE_URL } = await getConfig();

  const response = await fetch(`${API_BASE_URL}/zones`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    const errorText = await parseJsonError(response, "Failed to create zone");
    console.error("Failed to create zone:", errorText);
    throw new Error("Failed to create zone");
  }
  return (await response.json()).zone as Zone;
}

export async function createRecord(
  record: CreateRecordPayload,
): Promise<Record> {
  const { API_BASE_URL } = await getConfig();

  const response = await fetch(`${API_BASE_URL}/records`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    const errorText = await parseJsonError(response, "Failed to create record");
    console.error("Failed to create record:", errorText);
    throw new Error("Failed to create record");
  }
  return (await response.json()).record as Record;
}

export async function updateZone(
  name: string,
  zone: ZonePayload,
): Promise<Zone> {
  const { API_BASE_URL } = await getConfig();

  const response = await fetch(
    `${API_BASE_URL}/zones/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: await getHeaders(),
      body: JSON.stringify(zone),
    },
  );
  if (!response.ok) {
    const errorText = await parseJsonError(response, "Failed to update zone");
    console.error("Failed to update zone:", errorText);
    throw new Error("Failed to update zone");
  }
  return (await response.json()).zone as Zone;
}

export async function deleteZone(name: string): Promise<void> {
  const { API_BASE_URL } = await getConfig();

  const response = await fetch(
    `${API_BASE_URL}/zones/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
      headers: await getHeaders(),
    },
  );
  if (!response.ok) {
    const errorText = await parseJsonError(response, "Failed to delete zone");
    console.error("Failed to delete zone:", errorText);
    throw new Error("Failed to delete zone");
  }
}

export async function updateRecord(
  id: number,
  record: UpdateRecordPayload,
): Promise<Record> {
  const { API_BASE_URL } = await getConfig();

  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: "PUT",
    headers: await getHeaders(),
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    const errorText = await parseJsonError(response, "Failed to update record");
    console.error("Failed to update record:", errorText);
    throw new Error("Failed to update record");
  }
  return (await response.json()).record as Record;
}

export async function deleteRecord(id: number): Promise<void> {
  const { API_BASE_URL } = await getConfig();

  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await parseJsonError(response, "Failed to delete record");
    console.error("Failed to delete record:", errorText);
    throw new Error("Failed to delete record");
  }
}

export async function notifyZones(zoneName?: string | null): Promise<string> {
  const { API_BASE_URL } = await getConfig();

  const body: NotifyZonePayload = {
    zone_name: zoneName ?? null,
  };

  const response = await fetch(`${API_BASE_URL}/notify/zones`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await parseJsonError(
      response,
      "Failed to send DNS notify",
    );
    console.error("Failed to send DNS notify:", errorText);
    throw new Error("Failed to send DNS notify");
  }
  return (await response.json()).message as string;
}
