import { Zone, Record, ZoneHistory, RecordHistory } from "./types";

let API_BASE_URL: string | null = null;
let SECRET_KEY: string | null = null;

async function getConfig() {
  if (API_BASE_URL) {
    return { API_BASE_URL, SECRET_KEY };
  }

  const res = await fetch("/api/bindizr");
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

export async function getZones(): Promise<Zone[]> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/zones`, {
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch zones:", errorText);
    throw new Error("Failed to fetch zones");
  }
  return (await response.json()).zones as Zone[];
}

export async function getRecords(zoneId?: number): Promise<Record[]> {
  const { API_BASE_URL } = await getConfig();
  const url = zoneId
    ? `${API_BASE_URL}/records?zone_id=${zoneId}`
    : `${API_BASE_URL}/records`;
  const response = await fetch(url, { headers: await getHeaders() });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch records:", errorText);
    throw new Error("Failed to fetch records");
  }
  return (await response.json()).records as Record[];
}

export async function createZone(zone: Omit<Zone, "id">): Promise<Zone> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/zones`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to create zone:", errorText);
    throw new Error("Failed to create zone");
  }
  return response.json();
}

export async function createRecord(
  record: Omit<Record, "id">
): Promise<Record> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/records`, {
    method: "POST",
    headers: await getHeaders(),
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to create record:", errorText);
    throw new Error("Failed to create record");
  }
  return response.json();
}

export async function updateZone(zone: Zone): Promise<Zone> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/zones/${zone.id}`, {
    method: "PUT",
    headers: await getHeaders(),
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to update zone:", errorText);
    throw new Error("Failed to update zone");
  }
  return response.json();
}

export async function deleteZone(id: number): Promise<void> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to delete zone:", errorText);
    throw new Error("Failed to delete zone");
  }
}

export async function updateRecord(record: Record): Promise<Record> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/records/${record.id}`, {
    method: "PUT",
    headers: await getHeaders(),
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to update record:", errorText);
    throw new Error("Failed to update record");
  }
  return response.json();
}

export async function deleteRecord(id: number): Promise<void> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: "DELETE",
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to delete record:", errorText);
    throw new Error("Failed to delete record");
  }
  return response.json();
}

export async function reloadDns(): Promise<string> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/dns/reload`, {
    method: "POST",
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to reload DNS:", errorText);
    throw new Error("Failed to reload DNS");
  }
  return (await response.json()).msg as string;
}

export async function getDnsStatus(): Promise<string> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/dns/status`, {
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get DNS status:", errorText);
    throw new Error("Failed to get DNS status");
  }
  return (await response.json()).status as string;
}

export async function postDnsConfig(): Promise<string> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/dns/config`, {
    method: "POST",
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to post DNS config:", errorText);
    throw new Error("Failed to post DNS config");
  }
  return (await response.json()).msg as string;
}

export async function getZoneHistories(zoneId: number): Promise<ZoneHistory[]> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/zones/${zoneId}/histories`, {
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch zone histories:", errorText);
    throw new Error("Failed to fetch zone histories");
  }
  return (await response.json()).zone_histories as ZoneHistory[];
}

export async function getRecordHistories(
  recordId: number
): Promise<RecordHistory[]> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(
    `${API_BASE_URL}/records/${recordId}/histories`,
    { headers: await getHeaders() }
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch record histories:", errorText);
    throw new Error("Failed to fetch record histories");
  }
  return (await response.json()).record_histories as RecordHistory[];
}

export async function getRenderedZone(zoneId: number): Promise<string> {
  const { API_BASE_URL } = await getConfig();
  const response = await fetch(`${API_BASE_URL}/zones/${zoneId}/rendered`, {
    headers: await getHeaders(),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to fetch rendered zone:", errorText);
    throw new Error("Failed to fetch rendered zone");
  }
  return await response.text();
}
