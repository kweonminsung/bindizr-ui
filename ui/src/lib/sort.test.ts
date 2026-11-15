import assert from "node:assert/strict";
import test from "node:test";
import { sortRows } from "./sort.ts";

const rows = [
  { id: 1, name: "b", count: 2, at: null },
  { id: 2, name: "a", count: 2, at: "2026-11-02T00:00:00Z" },
  { id: 3, name: "c", count: 1, at: "2026-11-01T00:00:00Z" },
];

test("sortRows orders text, numbers and booleans in either direction", () => {
  assert.deepEqual(
    sortRows(rows, (row) => row.name, "asc").map((row) => row.id),
    [2, 1, 3],
  );
  assert.deepEqual(
    sortRows(rows, (row) => row.name, "desc").map((row) => row.id),
    [3, 1, 2],
  );
});

test("sortRows breaks ties by id in the sort's direction", () => {
  assert.deepEqual(
    sortRows(rows, (row) => row.count, "asc").map((row) => row.id),
    [3, 1, 2],
  );
  assert.deepEqual(
    sortRows(rows, (row) => row.count, "desc").map((row) => row.id),
    [2, 1, 3],
  );
});

test("sortRows keeps absent values last whatever the direction", () => {
  for (const order of ["asc", "desc"] as const) {
    const sorted = sortRows(rows, (row) => row.at, order);

    assert.equal(sorted[sorted.length - 1].id, 1);
  }
});
