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

/**
 * Numeric list filters are ignored while the field is empty or half-typed. The
 * fields they filter on are integers, so a fractional value is dropped rather
 * than sent for the API to reject.
 */
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
