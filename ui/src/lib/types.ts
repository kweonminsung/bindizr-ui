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

export const RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SOA",
  "SRV",
  "PTR",
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

/** Only MX and SRV carry a priority. */
export const PRIORITY_RECORD_TYPES: readonly RecordType[] = ["MX", "SRV"];

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

export interface ZoneDetail {
  zone: Zone;
  records: Record[];
}

export interface BulkRecordItem {
  name: string;
  record_type: RecordType;
  value: RecordValue;
  ttl?: number | null;
  priority?: number | null;
}

export interface BulkRecordsResult {
  applied: boolean;
  dry_run: boolean;
  inserted: number;
  records: Record[];
}

export const IMPORT_MODES = ["append", "upsert", "replace"] as const;

export type ImportMode = (typeof IMPORT_MODES)[number];

export interface ImportZonePayload {
  content: string;
  mode?: ImportMode;
  dry_run?: boolean;
}

export interface ImportSummary {
  parsed: number;
  added: number;
  deleted: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export interface ImportZoneResult {
  applied: boolean;
  dry_run: boolean;
  summary: ImportSummary;
  errors: string[];
}

export interface NotifyZonePayload {
  zone_name?: string | null;
  force?: boolean;
}

export const TSIG_ALGORITHMS = [
  "hmac-sha256",
  "hmac-sha384",
  "hmac-sha512",
] as const;

export type TsigAlgorithm = (typeof TSIG_ALGORITHMS)[number];

export interface TsigKey {
  id: number;
  name: string;
  algorithm: string;
  global: boolean;
  created_at: string;
  /** Only returned on create and single-key reads. */
  secret?: string | null;
}

export interface CreateTsigKeyPayload {
  name: string;
  algorithm?: string | null;
  /** Existing base64 secret to import; omit to generate a random one. */
  secret?: string | null;
  global?: boolean;
}

export interface ZoneTsigPolicy {
  id: number;
  tsig_key: string;
  record_name_pattern: string;
  record_types: string;
  created_at: string;
}

export interface CreateZoneTsigPolicyPayload {
  tsig_key: string;
  record_name_pattern?: string | null;
  record_types?: string | null;
}

export interface ZoneSnapshot {
  serial: number;
  primary_ns: string;
  admin_email: string;
  ttl: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
  created_at: string;
}

/** Reconstructed from the change history, so it has no id and a plain string value. */
export interface SnapshotRecord {
  name: string;
  record_type: string;
  value: string;
  ttl?: number | null;
  priority?: number | null;
}

export interface SnapshotDetail {
  snapshot: ZoneSnapshot;
  records: SnapshotRecord[];
}

export const SNAPSHOT_DIFF_CHANGES = ["added", "removed", "changed"] as const;

export type SnapshotDiffChange = (typeof SNAPSHOT_DIFF_CHANGES)[number];

/** One RRset (owner name + type) whose records differ between two serials. */
export interface SnapshotDiffEntry {
  change: SnapshotDiffChange;
  name: string;
  record_type: string;
  /** Rdata at the `from` serial; empty for `added`. */
  from_rdata: string[];
  /** Rdata at the `to` serial; empty for `removed`. */
  to_rdata: string[];
  ttl?: number | null;
}

export interface SnapshotDiffSummary {
  added: number;
  removed: number;
  changed: number;
}

export interface SnapshotDiff {
  from_serial: number;
  to_serial: number;
  entries: SnapshotDiffEntry[];
  summary: SnapshotDiffSummary;
}

export interface RollbackZonePayload {
  serial: number;
  dry_run?: boolean;
}

export interface RollbackSummary {
  records_added: number;
  records_deleted: number;
  records_unchanged: number;
  soa_changed: boolean;
}

export interface RollbackZoneResult {
  applied: boolean;
  dry_run: boolean;
  target_serial: number;
  new_serial: number;
  summary: RollbackSummary;
}

export const SECONDARY_STATUSES = [
  "in_sync",
  "lagging",
  "ahead",
  "unreachable",
] as const;

export type SecondaryStatus = (typeof SECONDARY_STATUSES)[number];

export interface SecondaryStatusItem {
  address: string;
  status: SecondaryStatus;
  visible_serial?: number | null;
  error?: string | null;
}

export interface ZoneStatus {
  zone: string;
  serial: number;
  secondaries: SecondaryStatusItem[];
}

export interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
  hasNext: boolean;
}

export interface PageQuery {
  limit?: number;
  offset?: number;
}

export interface ZoneListQuery extends PageQuery {
  search?: string;
  name?: string;
  id?: number;
  primary_ns?: string;
  admin_email?: string;
  ttl?: number;
  min_ttl?: number;
  max_ttl?: number;
  serial?: number;
}

export interface RecordListQuery extends PageQuery {
  zone_name?: string;
  search?: string;
  name?: string;
  record_type?: RecordType | "";
  value?: string;
  ttl?: number;
  min_ttl?: number;
  max_ttl?: number;
  priority?: number;
  min_priority?: number;
  max_priority?: number;
}
