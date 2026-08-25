import assert from "node:assert/strict";
import { test } from "node:test";

/** Mirrors `src/lib/unit-pick.ts` — prefix typing is not the primary path. */
function unitConfig(unit, towers) {
  const name = towers.find((t) => t.id === unit.towerId)?.name ?? "";
  if (/2\s*bhk/i.test(name) || /^[A-Z]{2,3}A/i.test(unit.code)) return "2BHK";
  if (/3\s*bhk/i.test(name) || /^[A-Z]{2,3}B/i.test(unit.code)) return "3BHK";
  return "";
}
function availableUnitsFor(units, towers, projectId, opts = {}) {
  let pool = units.filter((u) => u.projectId === projectId && u.status === "available");
  if (opts.towerId) pool = pool.filter((u) => u.towerId === opts.towerId);
  if (opts.config) {
    const want = opts.config.replace(/\s+/g, "").toUpperCase();
    const matched = pool.filter(
      (u) => unitConfig(u, towers).replace(/\s+/g, "").toUpperCase() === want,
    );
    if (matched.length) pool = matched;
  }
  return pool;
}
function pickNextUnit(units, towers, projectId, opts = {}) {
  const pool = availableUnitsFor(units, towers, projectId, opts);
  if (opts.prefix) {
    const pref = pool.filter((u) => u.code.startsWith(opts.prefix));
    if (pref.length) return pref[0];
  }
  return pool[0];
}

const towers = [
  { id: "t2", name: "Tower 2BHK", projectId: "p_av" },
  { id: "t3", name: "Tower 3BHK", projectId: "p_av" },
];
const units = [
  {
    id: "u1",
    projectId: "p_av",
    towerId: "t2",
    code: "AVA-0101",
    status: "available",
    kind: "flat",
    floor: 1,
    price: 1,
  },
  {
    id: "u2",
    projectId: "p_av",
    towerId: "t2",
    code: "AVA-0102",
    status: "booked",
    kind: "flat",
    floor: 1,
    price: 1,
  },
  {
    id: "u3",
    projectId: "p_av",
    towerId: "t3",
    code: "AVA-0103",
    status: "available",
    kind: "flat",
    floor: 1,
    price: 1,
  },
  {
    id: "u4",
    projectId: "p_sf",
    towerId: "t2",
    code: "SFA-0101",
    status: "available",
    kind: "flat",
    floor: 1,
    price: 1,
  },
];

test("available list is project-filtered and does not require typing prefixes", () => {
  const list = availableUnitsFor(units, towers, "p_av");
  assert.deepEqual(
    list.map((u) => u.code),
    ["AVA-0101", "AVA-0103"],
  );
});

test("BHK filter then prefix fallback when that band is exhausted", () => {
  const next2 = pickNextUnit(units, towers, "p_av", { config: "2BHK" });
  assert.equal(next2?.code, "AVA-0101");
  const missPrefix = pickNextUnit(units, towers, "p_av", { prefix: "ZZZ", config: "2BHK" });
  assert.equal(missPrefix?.code, "AVA-0101");
});
