export interface Zone {
  id: number;
  name: string;
  /** SOA MNAME: the primary nameserver. */
  mname: string;
  /** SOA RNAME: the admin email. */
  rname: string;
  default_ttl: number;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum_ttl: number;
  /** Whether the DNS plane serves the zone. A disabled one stays editable but
   * leaves the catalog and answers no transfer, so secondaries drop it. */
  enabled: boolean;
  /** Free-text note for operators; Bindizr never reads it. */
  description: string | null;
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
  /** At most 255 characters; empty clears it. */
  description?: string | null;
}

/** An omitted field keeps its value; a different `name` renames the zone. */
export type UpdateZonePayload = Partial<Omit<ZonePayload, "serial">> & {
  /** `false` stops the DNS plane serving the zone without deleting it. */
  enabled?: boolean | null;
};

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
  zone_name: string;
  ttl: number;
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

/** An omitted field keeps its value; `value` is required when `record_type` changes. */
export interface UpdateRecordPayload {
  name?: string;
  record_type?: RecordType;
  value?: RecordValue;
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
  zone_name: string;
  ttl: number;
  priority?: number | null;
}

export const RECORD_DIFF_CHANGES = ["added", "removed", "changed"] as const;

export type RecordDiffChange = (typeof RECORD_DIFF_CHANGES)[number];

/** One record on one side of a diff; rendering the rdata is left to the client. */
export interface RecordDiffValue {
  value: RecordValue;
  ttl: number;
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

/** Exactly one of `content` (zone file text) and `from_server` (AXFR source). */
export interface ImportZonePayload {
  content?: string;
  from_server?: string;
  mode?: ImportMode;
  dry_run?: boolean;
  /** Pass over record types Bindizr does not store instead of failing the
   * whole file; they are counted as skipped and listed in `skipped_records`. */
  skip_unsupported?: boolean;
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
  /** Records passed over under `skip_unsupported`. */
  skipped_records?: string[];
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
  /** Updates every zone without a grant. */
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

/** One zone granted to a token or TSIG key; the pattern and types narrow it. */
export interface ZoneGrant {
  id: number;
  zone_name: string;
  /** `*` any name, `@` apex, `*.sub` subtree, or an exact relative name. */
  record_name_pattern: string;
  /** `*` or a comma-separated list of record types. */
  record_types: string;
  /** A read-only grant narrows reads the same way and writes nothing: for a
   * token the zone stays visible, for a TSIG key the whole zone still
   * transfers. */
  can_write: boolean;
  created_at: string;
}

/** The pattern and types default to `*`, and the grant to read-write. */
export interface CreateZoneGrantPayload {
  zone_name: string;
  record_name_pattern?: string | null;
  record_types?: string | null;
  can_write?: boolean;
}

export interface TsigGrant extends ZoneGrant {
  tsig_key: string;
}

export type CreateTsigGrantPayload = CreateZoneGrantPayload;

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

/** Reconstructed from the zone's journal, so it has no id. */
export interface VersionRecord {
  name: string;
  record_type: string;
  value: RecordValue;
  ttl: number;
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

export const DNSSEC_ALGORITHMS = [
  "ecdsap256sha256",
  "ecdsap384sha384",
  "ed25519",
  "ed448",
  "rsasha256",
  "rsasha512",
] as const;

export type DnssecAlgorithm = (typeof DNSSEC_ALGORITHMS)[number];

export const DNSSEC_DENIAL_MODES = ["nsec", "nsec3"] as const;

export type DnssecDenialMode = (typeof DNSSEC_DENIAL_MODES)[number];

/** Seeded at startup and refused for deletion. */
export const DEFAULT_DNSSEC_POLICY_NAME = "default";

/** A named bundle of signing parameters that zones sign under. */
export interface DnssecPolicy {
  id: number;
  name: string;
  algorithm: string;
  denial: DnssecDenialMode;
  /** A KSK/ZSK pair instead of one CSK, so the ZSK rolls without touching the parent DS. */
  split_keys: boolean;
  signature_validity_days: number;
  signature_refresh_days: number;
  /** 0 disables scheduled ZSK rollovers. */
  zsk_lifetime_days: number;
  created_at: string;
}

/** The timing fields of a policy; the only ones an edit may touch. */
export interface DnssecPolicyTiming {
  signature_validity_days?: number | null;
  signature_refresh_days?: number | null;
  zsk_lifetime_days?: number | null;
}

/** Algorithm, denial and key layout are fixed once the policy exists. */
export interface CreateDnssecPolicyPayload extends DnssecPolicyTiming {
  name: string;
  algorithm?: DnssecAlgorithm | null;
  denial?: DnssecDenialMode | null;
  split_keys?: boolean;
}

/** An omitted field keeps its current value. */
export type UpdateDnssecPolicyPayload = DnssecPolicyTiming;

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
  /** Promotion for `published`, removal for `retired`; absent for `active`. */
  eligible_at?: string | null;
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

/** `published` when the parent serves a DS for the zone, `hidden` when none. */
export type DnssecDsState = "published" | "hidden";

/** One of the zone's SEP keys against the parent's DS records. */
export interface DnssecDelegationKeyInfo {
  id: number;
  key_tag: number;
  role: Exclude<DnssecKeyRole, "zsk">;
  state: DnssecKeyState;
  /** Whether every parent server serves this key's DS (matched whole). */
  ds_published: boolean;
  /** Whether a parent serves the DS only in a digest type Bindizr cannot
   * compute, leaving `ds_published` undecided rather than answered. */
  ds_digest_unsupported: boolean;
  /** When a `published` key's hold-down ends. */
  eligible_at?: string | null;
}

/** What the parent zone's servers answered when asked for the zone's DS. */
export interface DnssecDelegationInfo {
  /** The nameservers asked, from the zone's `parent_ns_addrs`. */
  parent_ns_addrs: string[];
  ds_state: DnssecDsState;
  /** Key tags of the DS records the parent serves. */
  ds_key_tags: number[];
  /** The zone's SEP keys, each with whether the parent serves its DS. */
  keys: DnssecDelegationKeyInfo[];
  /** How long caches may keep serving the parent's DS once removed. */
  ds_ttl?: number | null;
  checked_at: string;
}

export interface DnssecStatus {
  zone_name: string;
  enabled: boolean;
  /** Absent for an unsigned zone. */
  policy?: DnssecPolicy | null;
  keys: DnssecKey[];
  ds_records: DnssecDsRecord[];
  /** Whether the RFC 8078 delete CDS/CDNSKEY pair asks the parent to drop the DS. */
  withdrawing: boolean;
  serial: number;
  earliest_signature_expires_at?: string | null;
  /** Signatures the zone serves. */
  signatures: number;
  /** Signatures already past their expiration; any at all mean resolvers are
   * failing to validate part of the zone. */
  expired_signatures: number;
  /** When the re-signer next has work; absent for an unsigned zone. */
  next_resign_at?: string | null;
  /** The parent nameservers configured on the zone; absent until DNSSEC is enabled. */
  parent_ns_addrs?: string | null;
  /** Present only when the status comes from a parent DS check. */
  delegation?: DnssecDelegationInfo | null;
}

export interface EnableDnssecPayload {
  /** Name of the policy to sign under; defaults to `default`. */
  policy?: string | null;
  /** Comma-separated `host[:port]` asked for the zone's DS by every later
   * check. Required: Bindizr does not discover the parent. */
  parent_ns_addrs: string;
}

/** An omitted field keeps its value; an empty `parent_ns_addrs` returns the zone to discovery. */
export interface UpdateDnssecSettingsPayload {
  /** Must match the zone's denial mode and key layout; a new algorithm starts a rollover. */
  policy?: string | null;
  parent_ns_addrs?: string | null;
}

/** Which key to roll: required for split-key zones, omitted for CSK zones. */
export type DnssecRolloverRole = "ksk" | "zsk";

/** An API token; the secret is only ever in the create response. */
export interface ApiToken {
  id: number;
  name: string;
  description?: string | null;
  /** Covers every zone and the zone plane. */
  global: boolean;
  expires_at?: string | null;
  last_used_at?: string | null;
  created_at: string;
}

export interface CreateTokenPayload {
  /** Letters, digits, `.`, `_`, and `-`: one URL path segment. */
  name: string;
  /** At most 255 characters. */
  description?: string | null;
  /** 1 to 36500; omit for a token that never expires. */
  expires_in_days?: number | null;
  /** Fixed at creation. */
  global?: boolean;
}

/** The secret is shown this once. */
export interface CreatedToken {
  token: ApiToken;
  secret: string;
}

export interface TokenGrant extends ZoneGrant {
  api_token: string;
}

export type CreateTokenGrantPayload = CreateZoneGrantPayload;

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

export interface ZoneVersionListQuery extends PageQuery {
  /** Also list signer-only serials (DNSSEC re-signs and rollovers), hidden by default. */
  include_signer_serials?: boolean;
}

export interface ZoneListQuery extends PageQuery {
  search?: string;
  name?: string;
  id?: number;
  mname?: string;
  rname?: string;
  default_ttl?: number;
  min_default_ttl?: number;
  max_default_ttl?: number;
  serial?: number;
  /** `true` keeps the zones the DNS plane serves, `false` the disabled ones. */
  enabled?: boolean;
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
