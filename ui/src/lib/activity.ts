import { ActivityResult, ActivityTarget } from "./types";

const ENTITY_LABELS: { [entity: string]: string } = {
  access_log: "Access log",
  activity_log: "Activity log",
  dnssec: "DNSSEC",
  dnssec_policy: "DNSSEC policy",
  external_dns: "ExternalDNS",
  nsupdate: "nsupdate",
  token: "API token",
  transfer_log: "Transfer log",
  tsig_key: "TSIG key",
};

const WORD_LABELS: { [word: string]: string } = {
  ds: "DS",
  tsig: "TSIG",
};

function describeWords(value: string): string {
  const words = value.split("_").map((word) => WORD_LABELS[word] ?? word);
  const phrase = words.join(" ");
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function activityOperationEntity(operation: string): string {
  return operation.split(".")[0];
}

export function activityEntityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? describeWords(entity);
}

export function activityOperationLabel(operation: string): string {
  const [entity, action] = operation.split(".");
  if (!action) {
    return activityEntityLabel(entity);
  }
  return `${activityEntityLabel(entity)} · ${describeWords(action)}`;
}

export const ACTIVITY_RESULT_LABELS: { [result in ActivityResult]: string } = {
  changed: "Changed",
  succeeded: "Succeeded",
  failed: "Failed",
};

export function activityTargetLabel(target: ActivityTarget): string {
  const record = [target.record_name, target.record_type]
    .filter(Boolean)
    .join(" ");
  const recordID = target.record_id ? `#${target.record_id}` : "";
  return [
    target.name,
    target.zone_name,
    [record || (recordID && "Record"), recordID].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(" · ");
}
