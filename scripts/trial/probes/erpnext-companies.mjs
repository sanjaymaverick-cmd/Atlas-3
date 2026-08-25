/**
 * DUKIA sisters must exist in ERPNext by exact Atlas name.
 * Read-only. Never posts.
 *
 *   node scripts/trial/probes/erpnext-companies.mjs
 */
import { TRADING_COMPANIES } from "../../erpnext/companies.mjs";
import {
  ERP_SLOW_TIMEOUT_MS,
  erpnextFetch,
  health,
  loadDotEnv,
  readErpnextConfig,
} from "../../erpnext/lib.mjs";

loadDotEnv();
const cfg = readErpnextConfig();
const h = await health(cfg);
console.log("health  :", h.detail);

if (!cfg.configured || !h.reachable) {
  console.log("SKIP — ERPNext not configured or unreachable. Atlas still boots.");
  process.exit(0);
}

const params = new URLSearchParams({
  fields: JSON.stringify(["name", "abbr", "is_group", "parent_company"]),
  limit_page_length: "50",
});
const r = await erpnextFetch(cfg, `/api/resource/Company?${params}`, {}, ERP_SLOW_TIMEOUT_MS);
const rows = r.json?.data ?? [];
const names = new Set(rows.map((row) => row.name));
let failed = 0;
for (const name of TRADING_COMPANIES) {
  const ok = names.has(name);
  console.log(ok ? "PASS" : "FAIL", name, ok ? rows.find((x) => x.name === name)?.abbr : "missing");
  if (!ok) failed += 1;
}
const mock = names.has("MOCK ATLAS3 LLP");
console.log(mock ? "PASS" : "FAIL", "MOCK ATLAS3 LLP", mock ? "smoke company" : "missing");
if (!mock) failed += 1;
const group = names.has("DUKIA GROUP");
console.log(
  group ? "PASS" : "INFO",
  "DUKIA GROUP",
  group ? "optional parent" : "optional — not created",
);
if (failed) process.exitCode = 1;
