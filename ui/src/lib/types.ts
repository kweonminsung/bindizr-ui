export interface Zone {
  id: number;
  name: string;
  primary_ns: string;
  admin_email: string;
  ttl: number;
  serial?: number | null;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
}

export interface ZonePayload {
  name: string;
  primary_ns: string;
  admin_email: string;
  ttl: number;
  serial?: number | null;
  refresh?: number | null;
  retry?: number | null;
  expire?: number | null;
  minimum_ttl?: number | null;
}

export type RecordValue = string | string[];

export type RecordType =
  | "A"
  | "AAAA"
  | "CNAME"
  | "MX"
  | "TXT"
  | "NS"
  | "SOA"
  | "SRV"
  | "PTR";

export interface Record {
  id: number;
  name: string;
  record_type: RecordType;
  value: RecordValue;
  zone_id: number;
  zone_name?: string | null;
  ttl?: number | null;
  priority?: number | null;
}

export interface CreateRecordPayload {
  name: string;
  record_type: RecordType;
  value: RecordValue;
  zone_name: string;
  ttl?: number | null;
  priority?: number | null;
}

export interface UpdateRecordPayload {
  name: string;
  record_type: RecordType;
  value: RecordValue;
  ttl?: number | null;
  priority?: number | null;
}

export interface NotifyZonePayload {
  zone_name?: string | null;
}

export interface ListResult<T> {
  items: T[];
  hasNext: boolean;
}

export interface ZoneListQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface RecordListQuery {
  zone_name?: string;
  search?: string;
  record_type?: RecordType | "";
  limit?: number;
  offset?: number;
}
