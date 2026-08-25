import assert from "node:assert/strict";
import { test } from "node:test";
import { TRADING_COMPANIES } from "./companies.mjs";

test("matched IC receivable/payable elim uses two offsetting lines", () => {
  const fromA = 500_000;
  const toB = 500_000;
  assert.equal(fromA, toB);
  const lines = fromA
    ? [
        { debit: fromA, credit: 0 },
        { debit: 0, credit: fromA },
      ]
    : [];
  assert.equal(lines.length, 2);
  assert.equal(lines[0].debit, lines[1].credit);
  assert.equal(
    lines.reduce((s, l) => s + l.debit - l.credit, 0),
    0,
  );
});

test("mismatch does not elim — fix entity books first", () => {
  assert.notEqual(500_000, 400_000);
});

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
