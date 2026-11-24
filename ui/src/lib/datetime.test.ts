import assert from "node:assert/strict";
import test from "node:test";

import { toDayStart, toNextDayStart } from "./datetime.ts";

test("date range uses UTC midnight after the selected end date", () => {
  assert.equal(toDayStart("2028-02-29"), "2028-02-29T00:00:00Z");
  assert.equal(toNextDayStart("2028-02-29"), "2028-03-01T00:00:00.000Z");
  assert.equal(toNextDayStart("2026-12-31"), "2027-01-01T00:00:00.000Z");
  assert.equal(toNextDayStart(""), undefined);
});
