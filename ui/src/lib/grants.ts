import { TokenGrant, ZoneGrant } from "./types";

const MATCH_ANY = "*";

const APEX = "@";

/** The labels of a rendered name. Bindizr escapes an in-label dot as `\046`,
 * so every bare `.` it sends is a label boundary. */
const toLabels = (name: string) =>
  name
    .replace(/\.$/, "")
    .split(".")
    .filter((label) => label !== "");

/** Whether two rendered names are the same zone. A zone listing drops the
 * trailing dot and a record carries it, so neither compares as plain text. */
export const isSameZone = (a: string, b: string) => {
  const left = toLabels(a);
  const right = toLabels(b);
  return (
    left.length === right.length &&
    left.every((label, i) => label.toLowerCase() === right[i].toLowerCase())
  );
};

/** A record's owner name relative to its zone, `@` at the apex; null when it
 * is not inside the zone. */
const relativeOwnerName = (recordName: string, zoneName: string) => {
  const name = toLabels(recordName);
  const zone = toLabels(zoneName);
  if (name.length < zone.length) {
    return null;
  }

  const offset = name.length - zone.length;
  const inside = zone.every(
    (label, i) => name[offset + i].toLowerCase() === label.toLowerCase(),
  );
  if (!inside) {
    return null;
  }
  return offset === 0 ? APEX : name.slice(0, offset).join(".");
};

/** Whether a grant's name pattern covers a relative owner name: `*` any, `@`
 * the apex, `*.sub` that name and under it, anything else exact. Compared
 * label by label, so `xsub` is not inside `sub`. */
const matchesNamePattern = (pattern: string, relative: string) => {
  if (pattern === MATCH_ANY) {
    return true;
  }
  if (pattern === APEX) {
    return relative === APEX;
  }

  if (pattern.startsWith("*.")) {
    if (relative === APEX) {
      return false;
    }
    const name = toLabels(relative);
    const root = toLabels(pattern.slice(2));
    return (
      name.length >= root.length &&
      root.every(
        (label, i) =>
          name[name.length - root.length + i].toLowerCase() ===
          label.toLowerCase(),
      )
    );
  }

  return relative.toLowerCase() === pattern.toLowerCase();
};

/** Whether a grant's type filter permits a record type. */
const matchesRecordTypes = (types: string, recordType: string) =>
  types === MATCH_ANY || types.split(",").some((type) => type === recordType);

interface GrantedRecord {
  zone_name: string;
  name: string;
  type: string;
}

/** Whether a grant reaches one record: zone, name pattern and types all have
 * to cover it. Mirrors the service's matching, which stays the authority —
 * this only decides what the UI offers. */
export const grantCoversRecord = (
  grant: TokenGrant | ZoneGrant,
  record: GrantedRecord,
) => {
  if (!isSameZone(grant.zone_name, record.zone_name)) {
    return false;
  }
  const relative = relativeOwnerName(record.name, record.zone_name);
  return (
    relative !== null &&
    matchesNamePattern(grant.record_name_pattern, relative) &&
    matchesRecordTypes(grant.record_types, record.type)
  );
};
