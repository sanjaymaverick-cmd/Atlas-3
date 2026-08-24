import assert from "node:assert/strict";
import { test } from "node:test";
import { TRADING_COMPANIES, COMPANY_SPECS } from "./companies.mjs";
import { health, readErpnextConfig, refusePost } from "./lib.mjs";

test("unset env is not configured and does not throw", () => {
  const cfg = readErpnextConfig({});
  assert.equal(cfg.configured, false);
  assert.equal(cfg.url, "");
  assert.equal(cfg.company, "MOCK ATLAS3 LLP");
  assert.equal(cfg.postingEnabled, false);
});

test("posting stays off unless the flag is an explicit true", () => {
  assert.equal(readErpnextConfig({ ERPNEXT_POSTING_ENABLED: "false" }).postingEnabled, false);
  assert.equal(readErpnextConfig({ ERPNEXT_POSTING_ENABLED: "" }).postingEnabled, false);
  assert.equal(readErpnextConfig({ ERPNEXT_POSTING_ENABLED: "true" }).postingEnabled, true);
});

test("health with unset env is a soft fail, never a throw", async () => {
  const h = await health(readErpnextConfig({}));
  assert.equal(h.configured, false);
  assert.equal(h.ok, false);
  assert.equal(h.live, false);
  assert.match(h.detail, /not configured/i);
  assert.deepEqual(h.posted, []);
});

test("refusePost never posts while the flag is off", async () => {
  const r = await refusePost(readErpnextConfig({ ERPNEXT_POSTING_ENABLED: "false" }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.posted, []);
  assert.match(r.detail, /Posting is off/);
});

test("DUKIA trading names match Atlas allowlist character-for-character", () => {
  assert.deepEqual(TRADING_COMPANIES, ["SATYAM BUILDCOM", "SATYAM CONSTRUCTION", "MGB PRIME ESTATES LLP"]);
  assert.equal(COMPANY_SPECS.find((c) => c.name === "SATYAM BUILDCOM")?.abbr, "SBC");
  assert.equal(COMPANY_SPECS.find((c) => c.name === "SATYAM BUILDCOM")?.project, "Aerovista");
  assert.equal(COMPANY_SPECS.find((c) => c.name === "MOCK ATLAS3 LLP")?.abbr, "MA3");
  assert.equal(COMPANY_SPECS.find((c) => c.name === "DUKIA GROUP")?.isGroup, true);
});
