import assert from "node:assert/strict";
import test from "node:test";

import {
  formatRecordRdata,
  formatRecordValue,
  inputToRecordValue,
  recordValueToInput,
} from "./recordValue.ts";
import type { RecordValue } from "./types.ts";

test("record input preserves whitespace and empty TXT segments", () => {
  const values: RecordValue[] = ["", " padded ", ["first", "", " last ", ""]];
  for (const value of values) {
    const input = recordValueToInput(value);
    assert.deepEqual(
      inputToRecordValue(input.value, input.presentation),
      value,
    );
  }
});

test("record input escapes control bytes when a textarea would change them", () => {
  for (const [value, expected] of [
    ["a\r\nb\0\t\x7f", '"a\\013\\010b\\000\\009\\127"'],
    [["line\none", ""], '"line\\010one" ""'],
  ] satisfies [RecordValue, string][]) {
    const input = recordValueToInput(value);
    assert.deepEqual(input, { value: expected, presentation: true });
    assert.deepEqual(inputToRecordValue(input.value, input.presentation), {
      presentation: expected,
    });
  }
});

test("record input preserves explicit binary TXT presentation", () => {
  const value = { presentation: String.raw`"\000\255" "" "a\\b\"c"` };
  const input = recordValueToInput(value);
  assert.deepEqual(inputToRecordValue(input.value, input.presentation), value);
});

test("record input separates entered lines without trimming their contents", () => {
  assert.deepEqual(inputToRecordValue("first\r\n\r\n last "), [
    "first",
    "",
    " last ",
  ]);
});

test("record input keeps quotes literal when presentation mode is disabled", () => {
  assert.equal(inputToRecordValue('"quoted"'), '"quoted"');
  assert.deepEqual(inputToRecordValue('"quoted"', true), {
    presentation: '"quoted"',
  });
});

test("record display renders text, segments and binary presentation", () => {
  assert.equal(formatRecordValue("text"), "text");
  assert.equal(formatRecordValue(["one", "two"]), "onetwo");
  assert.equal(
    formatRecordValue(["one", "", " two "], "TXT"),
    '"one" "" " two "',
  );
  assert.equal(formatRecordValue("", "TXT"), '""');
  assert.equal(
    formatRecordValue({ presentation: String.raw`"\255"` }),
    String.raw`"\255"`,
  );
});

test("record diffs preserve TXT boundaries, whitespace and escapes", () => {
  assert.equal(
    formatRecordRdata({ value: [' a"b\\c ', "", "한글\n"], ttl: 300 }, "TXT"),
    String.raw`" a\"b\\c " "" "한글\010"`,
  );
  assert.equal(formatRecordRdata({ value: "", ttl: 300 }, "TXT"), '""');
  assert.equal(
    formatRecordRdata(
      { value: { presentation: String.raw`"\255"` }, ttl: 300 },
      "TXT",
    ),
    String.raw`"\255"`,
  );
});

test("record diffs preserve WKS values", () => {
  for (const value of ["192.0.2.1 6", "192.0.2.1 6 0 15"]) {
    assert.equal(formatRecordRdata({ value, ttl: 300 }, "WKS"), value);
  }
});

test("record diffs include zero and nonzero MX and SRV priorities", () => {
  assert.equal(
    formatRecordRdata({ value: ".", ttl: 300, priority: 0 }, "MX"),
    "0 .",
  );
  assert.equal(
    formatRecordRdata(
      { value: "5 443 target.example.", ttl: 300, priority: 10 },
      "SRV",
    ),
    "10 5 443 target.example.",
  );
});
