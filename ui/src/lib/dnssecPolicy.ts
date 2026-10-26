import type { DnssecKey, DnssecPolicy } from "./types.ts";

/** Key layout stays fixed while signed; denial and algorithm may change. */
export function policyMoveCandidates(
  current: DnssecPolicy | null | undefined,
  policies: DnssecPolicy[],
): DnssecPolicy[] {
  return current
    ? policies.filter(
        (policy) =>
          policy.name !== current.name &&
          policy.split_keys === current.split_keys,
      )
    : [];
}

/** Starting another algorithm rollover waits until every key is active. */
export function policyMoveBlocked(
  target: DnssecPolicy | undefined,
  keys: Pick<DnssecKey, "algorithm" | "state">[],
): boolean {
  return (
    target !== undefined &&
    keys.some((key) => key.algorithm !== target.algorithm) &&
    keys.some((key) => key.state !== "active")
  );
}
