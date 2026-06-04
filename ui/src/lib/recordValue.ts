import { RecordValue } from "./types";

export function formatRecordValue(value: RecordValue) {
  return Array.isArray(value) ? value.join("") : value;
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
