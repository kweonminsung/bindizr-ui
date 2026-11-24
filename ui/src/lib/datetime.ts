export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/** A date input's `YYYY-MM-DD` as the RFC 3339 instant that UTC day begins. */
export const toDayStart = (date: string) =>
  date.trim() === "" ? undefined : `${date}T00:00:00Z`;

/** The exclusive upper bound for a date range that includes this UTC day. */
export function toNextDayStart(date: string): string | undefined {
  const start = toDayStart(date);
  if (!start) return undefined;

  const nextDay = new Date(start);
  if (Number.isNaN(nextDay.getTime())) return undefined;
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString();
}
