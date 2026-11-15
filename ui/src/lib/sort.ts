import type { SortOrder } from "./types.ts";

/** A value a listing compares rows by; absent values sort last either way. */
export type SortValue = string | number | boolean | null | undefined;

/** The rows of a listing fetched whole, ordered in the browser as the server
 * orders a paged one: by `value`, then by `id` in the same direction. */
export function sortRows<T extends { id: number }>(
  rows: readonly T[],
  value: (row: T) => SortValue,
  order: SortOrder,
): T[] {
  const direction = order === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);

    if (a == null || b == null) {
      if (a == null && b == null) return direction * (left.id - right.id);
      return a == null ? 1 : -1;
    }

    const compared =
      typeof a === "string" && typeof b === "string"
        ? a.localeCompare(b)
        : Number(a) - Number(b);

    return compared !== 0
      ? direction * compared
      : direction * (left.id - right.id);
  });
}
