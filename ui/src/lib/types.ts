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
  /** Create only: start with an apex NS record naming the MNAME (default true). */
  apex_ns?: boolean;
}

/** An omitted field keeps its value; a different `name` renames the zone. */
export type UpdateZonePayload = Partial<
  Omit<ZonePayload, "serial" | "apex_ns">
> & {
  /** `false` stops the DNS plane serving the zone without deleting it. */
  enabled?: boolean | null;
};

export type RecordValue = string | string[];

export const RECORD_TYPES = [
  "A",
  "AAAA",
  "CAA",
  "CNAME",
  "DNAME",
  "DS",
  "MX",
  "NAPTR",
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
  type: RecordType;
  value: RecordValue;
  zone_id: number;
  zone_name: string;
  ttl: number;
  priority?: number | null;
  /** The record actions this caller may take on it; empty on a derived row. */
  actions: Action[];
}

export interface CreateRecordPayload {
  name: string;
  type: RecordType;
  value: RecordValue;
  zone_name: string;
  ttl?: number | null;
  /** Only MX and SRV take one; omitted, it is served and compared as 10. */
  priority?: number | null;
}

/** An omitted field keeps its value; `value` is required when `type` changes. */
export interface UpdateRecordPayload {
  name?: string;
  type?: RecordType;
  value?: RecordValue;
  ttl?: number | null;
  priority?: number | null;
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
  type: string;
  value: RecordValue;
  zone_id: number;
  zone_name: string;
  ttl: number;
  priority?: number | null;
  /** The record actions this caller may take on it; empty on a derived row. */
  actions: Action[];
}

export const SORT_ORDERS = ["asc", "desc"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

export const ZONE_SORT_FIELDS = [
  "name",
  "serial",
  "default_ttl",
  "created_at",
] as const;

export type ZoneSortField = (typeof ZONE_SORT_FIELDS)[number];

export const RECORD_SORT_FIELDS = [
  "name",
  "type",
  "ttl",
  "priority",
  "created_at",
] as const;

export type RecordSortField = (typeof RECORD_SORT_FIELDS)[number];

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
  type: string;
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

/** A record a write reports back; a dry run writes nothing to carry an id. */
export interface WrittenRecord extends Omit<Record, "id"> {
  id?: number | null;
}

/** A record write: the record it left, and the change as a diff. */
export interface RecordWriteResult {
  applied: boolean;
  dry_run: boolean;
  record: WrittenRecord;
  diff: RecordDiff;
}

/** What a delete removed, or would have. Matching nothing is not an error. */
export interface DeleteRecordsResult {
  applied: boolean;
  dry_run: boolean;
  deleted: number;
  records: WrittenRecord[];
  diff: RecordDiff;
}

/** A zone write: its fields are the change, so there is no diff. */
export interface ZoneWriteResult {
  applied: boolean;
  dry_run: boolean;
  zone: Zone;
}

/** What deleting a zone takes with it; a dry run reports the counts only. */
export interface DeleteZoneResult {
  applied: boolean;
  dry_run: boolean;
  zone: Zone;
  /** Counts of what goes with the zone, not the rows themselves. */
  records_deleted: number;
  versions_deleted: number;
}

export const IMPORT_MODES = ["append", "upsert", "replace"] as const;

export type ImportMode = (typeof IMPORT_MODES)[number];

/** Exactly one of `content` (zone file text) and `from_server` (AXFR source). */
export interface ImportZonePayload {
  content?: string;
  from_server?: string;
  mode?: ImportMode;
  dry_run?: boolean;
  /** Create the zone from the file's SOA; without it a miss is an error. */
  create?: boolean;
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
  algorithm: TsigAlgorithm;
  /** The role whose grants decide what updates and transfers the key may sign. */
  role_name: string;
  created_at: string;
  /** Only returned on create and single-key reads. */
  secret?: string | null;
}

export interface CreateTsigKeyPayload {
  name: string;
  algorithm?: string | null;
  /** Existing base64 secret to import; omit to generate a random one. */
  secret?: string | null;
  role_name: string;
}

/** A registered secondary server. */
export interface Secondary {
  id: number;
  name: string;
  /** host[:port] */
  address: string;
  /** Disabled: no NOTIFY, no unsigned transfer, no probe. */
  enabled: boolean;
  /** TSIG key its NOTIFY is signed with, if any. */
  notify_key_name: string | null;
  created_at: string;
}

export interface CreateSecondaryPayload {
  name: string;
  address: string;
  notify_key_name?: string | null;
}

/** An omitted field keeps its value; an empty `notify_key` clears it. */
export interface UpdateSecondaryPayload {
  address?: string;
  enabled?: boolean;
  notify_key_name?: string;
}

export interface NotifyCheck {
  address: string;
  error?: string | null;
}

/** What a secondary answered when checked. */
export interface SecondaryCheck {
  secondary: Secondary;
  /** Socket addresses the registered address resolves to now. */
  addresses: string[];
  resolve_error?: string | null;
  catalog_zone_name: string;
  /** The serial Bindizr's own listener serves the catalog zone at; absent with `listener_error`. */
  catalog_serial?: number | null;
  listener_error?: string | null;
  catalog: SecondaryStatusItem;
  notifies: NotifyCheck[];
  /** How Bindizr served the secondary's transfers. */
  transfers: TransferSummary;
}

/** Which transfer a secondary asked Bindizr for. */
export type TransferKind = "axfr" | "ixfr";

/** Answered, refused, or allowed and then broken off by a failure. */
export type TransferResult = "ok" | "refused" | "failed";

/** One transfer Bindizr answered, or refused, for a secondary's address. */
export interface Transfer {
  address: string;
  zone_name: string;
  kind: TransferKind;
  result: TransferResult;
  /** Whether the answer was a delta rather than the whole zone. */
  incremental: boolean;
  /** The serial the answer reached; absent when nothing was transferred. */
  serial?: number | null;
  at: string;
  /** Why the transfer was refused or failed. */
  error?: string | null;
}

/** How a secondary's zones were last served. */
export interface TransferSummary {
  zones: number;
  axfr: number;
  ixfr_full: number;
  ixfr_delta: number;
  refused: number;
  /** Allowed, then broken off by a failure. */
  failed: number;
}

/** The transfers Bindizr served one secondary. */
export interface SecondaryTransfers {
  secondary_name: string;
  address: string;
  summary: TransferSummary;
  transfers: Transfer[];
}

/** One operation a role grant permits, spelled `<resource>:<action>`. */
export const ACTIONS = [
  "zone:read",
  "zone:create",
  "zone:update",
  "zone:delete",
  "zone:transfer",
  "record:read",
  "record:create",
  "record:update",
  "record:delete",
  "dnssec:read",
  "dnssec:manage",
  "secondary:read",
  "secondary:manage",
  "access:manage",
] as const;

export type Action = (typeof ACTIONS)[number];

/** What each action permits, as the grant picker explains it. */
export const ACTION_DESCRIPTIONS: { [A in Action]: string } = {
  "zone:read": "Read a zone's status and version history.",
  "zone:create": "Create zones.",
  "zone:update": "Change a zone's settings, send NOTIFY, roll back a version.",
  "zone:delete": "Delete zones.",
  "zone:transfer": "Answer a TSIG-signed AXFR/IXFR. TSIG keys only.",
  "record:read":
    "List and read records; with no name or type limit, also export the zone and read its versions and diffs.",
  "record:create":
    "Add records, including by import, nsupdate and ExternalDNS.",
  "record:update": "Change a record in place.",
  "record:delete": "Delete records, including by nsupdate and ExternalDNS.",
  "dnssec:read":
    "Read DNSSEC status and check the parent DS; in every zone, also read signing policies.",
  "dnssec:manage":
    "Enable, disable and re-sign, manage keys and rollovers; in every zone, also change signing policies.",
  "secondary:read": "List secondaries and the transfers served them.",
  "secondary:manage": "Register, change, check and remove secondaries.",
  "access:manage":
    "Manage roles, API tokens and TSIG keys; equivalent to admin, since its holder can grant itself anything.",
};

/** Actions on something no zone owns, so only an every-zone grant carries them. */
export const ALL_ZONES_ACTIONS: readonly Action[] = [
  "zone:create",
  "secondary:read",
  "secondary:manage",
  "access:manage",
];

/** A named set of grants that API tokens and TSIG keys authenticate into. */
export interface Role {
  id: number;
  name: string;
  description?: string | null;
  /** The built-in `admin` role. */
  builtin: boolean;
  grant_count: number;
  /** The API tokens authenticating into the role. */
  token_count: number;
  /** The TSIG keys authenticating into the role. */
  tsig_key_count: number;
  created_at: string;
}

export interface CreateRolePayload {
  /** Letters, digits, `.`, `_`, and `-`: one URL path segment. */
  name: string;
  description?: string | null;
}

/** Actions in one zone, or in every zone when `zone_name` is null; the pattern
 * and types narrow its `record:*` actions only. */
export interface RoleGrant {
  id: number;
  role_name: string;
  zone_name: string | null;
  actions: Action[];
  /** `*` any name, `@` apex, `*.sub` subtree, or an exact relative name. */
  record_name_pattern: string;
  /** `*` or a comma-separated list of record types. */
  record_types: string;
  created_at: string;
}

/** Omit `zone_name` to cover every zone; the pattern and types default to `*`. */
export interface CreateRoleGrantPayload {
  zone_name?: string | null;
  actions: Action[];
  record_name_pattern?: string | null;
  record_types?: string | null;
}

/** The request path that produced a change — the HTTP API, the daemon socket,
 * an RFC 2136 update — or `system`, the DNSSEC scheduler. */
export const CHANGE_SOURCES = ["api", "socket", "nsupdate", "system"] as const;

export type ChangeSource = (typeof CHANGE_SOURCES)[number];

/** The named credential a change was made under. */
export interface ChangeActor {
  kind: "token" | "tsig_key";
  name: string;
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
  change_source: ChangeSource;
  /** The API token or TSIG key it was made under; null for socket commands,
   * unauthenticated requests, unsigned updates, and background work. */
  changed_by?: ChangeActor | null;
  created_at: string;
}

/** Reconstructed from the zone's journal, so it has no id. */
export interface VersionRecord {
  name: string;
  type: string;
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
  added: number;
  deleted: number;
  unchanged: number;
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
  /** The built-in `default` policy, which cannot be deleted. */
  builtin: boolean;
  algorithm: DnssecAlgorithm;
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
  algorithm: DnssecAlgorithm;
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
  parent_ns_addrs?: string[] | null;
  /** Present only when the status comes from a parent DS check. */
  delegation?: DnssecDelegationInfo | null;
}

export interface EnableDnssecPayload {
  /** Name of the policy to sign under; defaults to `default`. */
  policy_name?: string | null;
  /** Comma-separated `host[:port]` asked for the zone's DS by every later
   * check. Required: Bindizr does not discover the parent. */
  parent_ns_addrs: string[];
}

/** An omitted field keeps its value; `parent_ns_addrs` must name at least one server. */
export interface UpdateDnssecSettingsPayload {
  /** Must match the zone's denial mode and key layout; a new algorithm starts a rollover. */
  policy_name?: string | null;
  parent_ns_addrs?: string[] | null;
}

/** Which key to roll: required for split-key zones, omitted for CSK zones. */
export type DnssecRolloverRole = "ksk" | "zsk";

/** An API token; the secret is only ever in the create response. */
export interface ApiToken {
  id: number;
  name: string;
  description?: string | null;
  /** The role whose grants decide what the token may do. */
  role_name: string;
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
  role_name: string;
}

/** The secret is shown this once. */
export interface CreatedToken {
  token: ApiToken;
  secret: string;
}

export const SECONDARY_STATUSES = [
  "in_sync",
  "lagging",
  "ahead",
  "reachable",
  "unreachable",
] as const;

export type SecondaryStatus = (typeof SECONDARY_STATUSES)[number];

export interface SecondaryStatusItem {
  address: string;
  status: SecondaryStatus;
  visible_serial?: number | null;
  error?: string | null;
  /** The latest transfer of this zone Bindizr served the address. */
  last_transfer?: Transfer | null;
}

export interface ZoneStatus {
  zone_name: string;
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
  /** `true` keeps the zones signing under a DNSSEC policy, `false` the rest. */
  signed?: boolean;
  min_serial?: number;
  max_serial?: number;
  /** RFC 3339; keeps zones created at or after it. */
  created_after?: string;
  /** RFC 3339; keeps zones created at or before it. */
  created_before?: string;
  sort?: ZoneSortField;
  order?: SortOrder;
}

export interface RecordListQuery extends PageQuery {
  zone_name?: string;
  search?: string;
  name?: string;
  /** A RecordType; signed listings also accept a derived DNSSEC type. */
  type?: string;
  value?: string;
  ttl?: number;
  min_ttl?: number;
  max_ttl?: number;
  priority?: number;
  min_priority?: number;
  max_priority?: number;
  sort?: RecordSortField;
  order?: SortOrder;
}

/** The machine-readable classification every error payload carries. */
export const ERROR_CODES = [
  "INVALID_INPUT",
  "INVALID_ZONE_FIELD",
  "INVALID_RECORD_NAME",
  "INVALID_RECORD_VALUE",
  "INVALID_JSON_BODY",
  "ZONE_CONFLICT",
  "RECORD_CONFLICT",
  "TOKEN_CONFLICT",
  "ENDPOINT_NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "ZONE_NOT_FOUND",
  "RECORD_NOT_FOUND",
  "TOKEN_NOT_FOUND",
  "VERSION_NOT_FOUND",
  "SECONDARY_NOT_FOUND",
  "SECONDARY_CONFLICT",
  "TSIG_KEY_NOT_FOUND",
  "TSIG_KEY_CONFLICT",
  "TSIG_KEY_IN_USE",
  "ROLE_NOT_FOUND",
  "ROLE_CONFLICT",
  "ROLE_IN_USE",
  "ROLE_GRANT_NOT_FOUND",
  "DNSSEC_ALREADY_ENABLED",
  "DNSSEC_NOT_ENABLED",
  "DNSSEC_ROLLOVER_IN_PROGRESS",
  "DNSSEC_NO_ROLLOVER_IN_PROGRESS",
  "DNSSEC_DS_PUBLISHED",
  "DNSSEC_DS_NOT_PUBLISHED",
  "DNSSEC_DS_UNVERIFIED",
  "DNSSEC_POLICY_NOT_FOUND",
  "DNSSEC_POLICY_CONFLICT",
  "DNSSEC_POLICY_IN_USE",
  "DNSSEC_SIGNING_FAILED",
  "UNAUTHORIZED",
  "INVALID_TOKEN",
  "FORBIDDEN",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Actions held, and record actions held with no name or type limit. */
export interface PermittedActions {
  actions: Action[];
  whole_zone: Action[];
}

/** What the caller may do: `all_zones` for unlisted zones, `zones` where
 * zone grants add to it. */
export interface Permissions {
  all_zones: PermittedActions;
  zones: (PermittedActions & { zone_name: string })[];
}
