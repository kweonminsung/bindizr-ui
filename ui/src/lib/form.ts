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

export const toOptionalNumber = (value: string, fieldName = "Value") => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  return parseFiniteNumber(trimmed, fieldName);
};
