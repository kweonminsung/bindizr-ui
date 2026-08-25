export interface Zone {
  id: number;
  name: string;
  /** SOA MNAME: the primary nameserver. */
  mname: string;
  /** SOA RNAME: the admin email. */
  rname: string;
  default_ttl: number;
  serial?: number | null;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
}

export interface ZonePayload {
  name: string;
  mname: string;
  rname: string;
  default_ttl: number;
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
  "CAA",
  "CNAME",
  "DS",
  "MX",
  "TXT",
  "NS",
  "SOA",
  "SRV",
  "PTR",
  "SSHFP",
  "TLSA",
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

/** Types only the signer emits; they mark the derived rows. */
export const DERIVED_RECORD_TYPES = [
  "DNSKEY",
  "RRSIG",
  "NSEC",
  "NSEC3",
  "NSEC3PARAM",
  "CDS",
  "CDNSKEY",
] as const;

/** A row of the signed listing: user records plus derived DNSSEC rows. */
export interface SignedRecord {
  /** Absent on derived DNSSEC rows. */
  id?: number | null;
  name: string;
  /** A RecordType, or a derived DNSSEC type on derived rows. */
  record_type: string;
  value: RecordValue;
  zone_id: number;
  zone_name?: string | null;
  ttl?: number | null;
  priority?: number | null;
}

export const RECORD_DIFF_CHANGES = ["added", "removed", "changed"] as const;

export type RecordDiffChange = (typeof RECORD_DIFF_CHANGES)[number];

/** One record on one side of a diff; rendering the rdata is left to the client. */
export interface RecordDiffValue {
  value: RecordValue;
  ttl?: number | null;
  priority?: number | null;
}

/** One RRset (owner name + type) whose records differ. */
export interface RecordDiffEntry {
  change: RecordDiffChange;
  name: string;
  record_type: string;
  /** Empty for `added`. */
  from: RecordDiffValue[];
  /** Empty for `removed`. */
  to: RecordDiffValue[];
}

export interface RecordDiffSummary {
  added: number;
  removed: number;
  changed: number;
}

export interface RecordDiff {
  entries: RecordDiffEntry[];
  summary: RecordDiffSummary;
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
  diff: RecordDiff;
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
  diff: RecordDiff;
  errors: string[];
}

export interface NotifyZonePayload {
  zone_name?: string | null;
  /** Bump the serial first, so secondaries transfer even when nothing changed. */
  bump_serial?: boolean;
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

export interface ZoneVersion {
  serial: number;
  mname: string;
  rname: string;
  default_ttl: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
  created_at: string;
}

/** Reconstructed from the change history, so it has no id and a plain string value. */
export interface VersionRecord {
  name: string;
  record_type: string;
  value: string;
  ttl?: number | null;
  priority?: number | null;
}

export interface VersionDetail {
  version: ZoneVersion;
  records: VersionRecord[];
}

export interface VersionDiff {
  from_serial: number;
  to_serial: number;
  diff: RecordDiff;
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

export const DNSSEC_ALGORITHMS = ["ecdsap256sha256", "ed25519"] as const;

export type DnssecAlgorithm = (typeof DNSSEC_ALGORITHMS)[number];

export const DNSSEC_DENIAL_MODES = ["nsec", "nsec3"] as const;

export type DnssecDenialMode = (typeof DNSSEC_DENIAL_MODES)[number];

export type DnssecKeyRole = "csk" | "ksk" | "zsk";

/** Rollover lifecycle: pre-published, signing, or draining out of caches. */
export type DnssecKeyState = "published" | "active" | "retired";

/** A signing key's public half; the private key never leaves the server. */
export interface DnssecKey {
  id: number;
  role: DnssecKeyRole;
  state: DnssecKeyState;
  state_changed_at: string;
  algorithm: string;
  key_tag: number;
  /** Apex DNSKEY RDATA in presentation form: `257 3 <alg> <public key>`. */
  dnskey: string;
  created_at: string;
}

/** A key's DS form for parent-zone registration. */
export interface DnssecDsRecord {
  key_tag: number;
  algorithm: number;
  digest_type: number;
  digest: string;
  /** Full presentation form: `<zone>. IN DS <tag> <alg> 2 <digest>`. */
  presentation: string;
}

export interface DnssecStatus {
  zone_name: string;
  enabled: boolean;
  denial: DnssecDenialMode;
  keys: DnssecKey[];
  ds_records: DnssecDsRecord[];
  serial: number;
  earliest_signature_expires_at?: string | null;
}

export interface EnableDnssecPayload {
  algorithm?: DnssecAlgorithm | null;
  /** Fixed at enable time. */
  denial?: DnssecDenialMode | null;
  /** Split KSK/ZSK keys instead of one CSK, so the ZSK rolls without touching the parent DS. */
  split_keys?: boolean;
}

/** Which key to roll: required for split-key zones, omitted for CSK zones. */
export type DnssecRolloverRole = "ksk" | "zsk";

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
  mname?: string;
  rname?: string;
  ttl?: number;
  min_ttl?: number;
  max_ttl?: number;
  serial?: number;
}

export interface RecordListQuery extends PageQuery {
  zone_name?: string;
  search?: string;
  name?: string;
  /** A RecordType; signed listings also accept a derived DNSSEC type. */
  record_type?: string;
  value?: string;
  ttl?: number;
  min_ttl?: number;
  max_ttl?: number;
  priority?: number;
  min_priority?: number;
  max_priority?: number;
}
