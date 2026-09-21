export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/** A date input's `YYYY-MM-DD` as the RFC 3339 instant that UTC day begins. */
export const toDayStart = (date: string) =>
  date.trim() === "" ? undefined : `${date}T00:00:00Z`;

/** The last instant of that UTC day, so "created before" takes the whole day;
 * timestamps carry sub-second precision, so the bound does too. */
export const toDayEnd = (date: string) =>
  date.trim() === "" ? undefined : `${date}T23:59:59.999999999Z`;
