import { RecordDiffValue, RecordValue } from "./types";

export function formatRecordValue(value: RecordValue) {
  return Array.isArray(value) ? value.join("") : value;
}

/** Zone-file rdata of a diff value: MX and SRV put the priority first. */
export function formatRecordRdata({ value, priority }: RecordDiffValue) {
  const formatted = formatRecordValue(value);
  return priority != null ? `${priority} ${formatted}` : formatted;
}

export function recordValueToInput(value: RecordValue) {
  return Array.isArray(value) ? value.join("\n") : value;
}

export function inputToRecordValue(value: string): RecordValue {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return lines.length > 1 ? lines : lines[0];
}
