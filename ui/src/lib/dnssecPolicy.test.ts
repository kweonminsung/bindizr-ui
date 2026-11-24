import assert from "node:assert/strict";
import test from "node:test";
import { policyMoveBlocked, policyMoveCandidates } from "./dnssecPolicy.ts";
import type { DnssecPolicyResponse } from "./types.ts";

const current: DnssecPolicyResponse = {
  id: 1,
  name: "current",
  builtin: false,
  algorithm: "ecdsap256sha256",
  denial: "nsec",
  key_layout: "csk",
  signature_validity_days: 14,
  signature_refresh_days: 3,
  zsk_lifetime_days: 0,
  created_at: "2026-10-26T00:00:00Z",
};

test("policy moves accept denial changes in both directions and algorithm changes", () => {
  for (const denial of ["nsec", "nsec3"] as const) {
    const source = { ...current, denial };
    const target: DnssecPolicyResponse = {
      ...current,
      id: 2,
      name: "target",
      denial: denial === "nsec" ? "nsec3" : "nsec",
    };
    const algorithm: DnssecPolicyResponse = {
      ...target,
      id: 3,
      name: "algorithm",
      algorithm: "ed25519",
    };
    assert.deepEqual(policyMoveCandidates(source, [target, algorithm]), [
      target,
      algorithm,
    ]);
  }
});

test("policy moves exclude the current policy and key layout changes", () => {
  for (const key_layout of ["csk", "split"] as const) {
    const source = { ...current, key_layout };
    const differentLayout = {
      ...current,
      id: 2,
      name: "different-layout",
      key_layout:
        key_layout === "split" ? ("csk" as const) : ("split" as const),
    };
    assert.deepEqual(
      policyMoveCandidates(source, [source, differentLayout]),
      [],
    );
  }
  assert.deepEqual(policyMoveCandidates(null, [current]), []);
});

test("policy moves preserve denial changes during key rollover and block another algorithm", () => {
  const target: DnssecPolicyResponse = { ...current, algorithm: "ed25519" };
  const active = { algorithm: current.algorithm, state: "active" as const };
  assert.equal(policyMoveBlocked(target, [active]), false);
  for (const state of ["published", "retired"] as const) {
    const keys = [active, { ...active, state }];
    assert.equal(
      policyMoveBlocked({ ...current, denial: "nsec3" }, keys),
      false,
    );
    assert.equal(policyMoveBlocked(target, keys), true);
    assert.equal(
      policyMoveBlocked(target, [
        active,
        { algorithm: target.algorithm, state },
      ]),
      true,
    );
  }
  assert.equal(policyMoveBlocked(undefined, [active]), false);
});
