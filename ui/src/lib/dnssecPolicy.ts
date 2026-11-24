import type { DnssecKeyResponse, DnssecPolicyResponse } from "./types.ts";

/** Key layout stays fixed while signed; denial and algorithm may change. */
export function policyMoveCandidates(
  current: DnssecPolicyResponse | null | undefined,
  policies: DnssecPolicyResponse[],
): DnssecPolicyResponse[] {
  return current
    ? policies.filter(
        (policy) =>
          policy.name !== current.name &&
          policy.key_layout === current.key_layout,
      )
    : [];
}

/** Starting another algorithm rollover waits until every key is active. */
export function policyMoveBlocked(
  target: DnssecPolicyResponse | undefined,
  keys: Pick<DnssecKeyResponse, "algorithm" | "state">[],
): boolean {
  return (
    target !== undefined &&
    keys.some((key) => key.algorithm !== target.algorithm) &&
    keys.some((key) => key.state !== "active")
  );
}
