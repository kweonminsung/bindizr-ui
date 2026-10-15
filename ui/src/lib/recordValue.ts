import type { RecordDiffValue, RecordValue } from "./types.ts";

export function formatRecordValue(value: RecordValue, recordType?: string) {
  if (recordType === "TXT") return toTxtPresentation(value);
  return Array.isArray(value)
    ? value.join("")
    : typeof value === "string"
      ? value
      : value.presentation;
}

/** Keep TXT boundaries and escapes visible in zone-version diffs. */
export function formatRecordRdata(
  { value, priority }: RecordDiffValue,
  recordType: string,
) {
  const formatted = formatRecordValue(value, recordType);
  return priority != null ? `${priority} ${formatted}` : formatted;
}

export function recordValueToInput(value: RecordValue) {
  if (typeof value === "object" && !Array.isArray(value)) {
    return { value: value.presentation, presentation: true };
  }
  const segments = Array.isArray(value) ? value : [value];
  // Textareas normalize line endings; DNS escapes preserve the original octets.
  if (segments.some((segment) => /[\x00-\x1f\x7f]/.test(segment))) {
    return { value: toTxtPresentation(value), presentation: true };
  }
  return { value: segments.join("\n"), presentation: false };
}

export function inputToRecordValue(
  value: string,
  presentation = false,
): RecordValue {
  if (presentation) return { presentation: value };
  const lines = value.split(/\r?\n/);
  return lines.length > 1 ? lines : lines[0];
}

/** Quote TXT segments without changing whitespace or character-string boundaries. */
function toTxtPresentation(value: RecordValue): string {
  if (typeof value === "object" && !Array.isArray(value)) {
    return value.presentation;
  }
  const segments = Array.isArray(value) ? value : [value];
  return segments
    .map(
      (segment) =>
        `"${segment.replace(/["\\\x00-\x1f\x7f]/g, (character) =>
          character === '"' || character === "\\"
            ? `\\${character}`
            : `\\${character.charCodeAt(0).toString().padStart(3, "0")}`,
        )}"`,
    )
    .join(" ");
}
