/** The labels of a rendered name. Bindizr escapes an in-label dot as `\046`,
 * so every bare `.` it sends is a label boundary. */
const toLabels = (name: string) =>
  name
    .replace(/\.$/, "")
    .split(".")
    .filter((label) => label !== "");

/** A zone name's lookup key, ignoring case and a trailing dot. */
export const zoneKey = (name: string) =>
  toLabels(name)
    .map((label) => label.toLowerCase())
    .join(".");
