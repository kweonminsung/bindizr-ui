import { Zone, Record } from './types';

const API_BASE_URL = 'http://localhost:8000'; // Replace with your API base URL

export async function getZones(): Promise<Zone[]> {
  const response = await fetch(`${API_BASE_URL}/zones`);
  if (!response.ok) {
    throw new Error('Failed to fetch zones');
  }
  return response.json();
}

export async function getRecords(zoneId: number): Promise<Record[]> {
  const response = await fetch(`${API_BASE_URL}/records?zone_id=${zoneId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch records');
  }
  return response.json();
}

export async function createZone(zone: Omit<Zone, 'id'>): Promise<Zone> {
  const response = await fetch(`${API_BASE_URL}/zones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    throw new Error('Failed to create zone');
  }
  return response.json();
}

export async function createRecord(
  record: Omit<Record, 'id'>
): Promise<Record> {
  const response = await fetch(`${API_BASE_URL}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    throw new Error('Failed to create record');
  }
  return response.json();
}

export async function updateZone(zone: Zone): Promise<Zone> {
  const response = await fetch(`${API_BASE_URL}/zones/${zone.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(zone),
  });
  if (!response.ok) {
    throw new Error('Failed to update zone');
  }
  return response.json();
}

export async function deleteZone(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/zones/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete zone');
  }
}

export async function updateRecord(record: Record): Promise<Record> {
  const response = await fetch(`${API_BASE_URL}/records/${record.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    throw new Error('Failed to update record');
  }
  return response.json();
}

export async function deleteRecord(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/records/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete record');
  }
}
