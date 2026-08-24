import assert from "node:assert/strict";
import { test } from "node:test";
import { TRADING_COMPANIES } from "./companies.mjs";

test("three sisters make three IC pairs, no self-pair, no group company", () => {
  const names = TRADING_COMPANIES;
  const pairs = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) pairs.push([names[i], names[j]]);
  }
  assert.equal(names.length, 3);
  assert.equal(pairs.length, 3);
  assert.ok(pairs.every(([a, b]) => a !== b));
  assert.ok(pairs.every(([a, b]) => a !== "DUKIA GROUP" && b !== "DUKIA GROUP"));
  assert.ok(pairs.some(([a, b]) => a === "SATYAM BUILDCOM" && b === "SATYAM CONSTRUCTION"));
});
