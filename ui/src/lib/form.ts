function parseFiniteNumber(value: string, fieldName: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return parsed;
}

export const toRequiredNumber = (value: string, fieldName = "Value") => {
  const trimmed = value.trim();

  if (trimmed === "") {
    throw new Error(`${fieldName} is required`);
  }

  return parseFiniteNumber(trimmed, fieldName);
};

/** How many of a list's filters are set, for the filter panel's badge. The
 * constraint takes any filter interface whose every field is a string. */
export const countActiveFilters = <T extends Record<keyof T, string>>(
  filters: T,
) =>
  (Object.values(filters) as string[]).filter((value) => value.trim() !== "")
    .length;

/** Ignored while empty or half-typed; the fields these filter on are integers. */
export const toFilterNumber = (value: string) => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : undefined;
};

export const toOptionalNumber = (value: string, fieldName = "Value") => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  return parseFiniteNumber(trimmed, fieldName);
};
