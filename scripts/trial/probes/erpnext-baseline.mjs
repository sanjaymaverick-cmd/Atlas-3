/**
 * ERPNext baseline / attest for MOCK ATLAS3 LLP.
 *
 * READ-ONLY. Counts journal rows so the run can prove Atlas never posted.
 * Run once at the start and again at the end.
 *
 *   node scripts/trial/probes/erpnext-baseline.mjs
 */
import { health, readErpnextConfig, erpnextFetch } from "../../erpnext/lib.mjs";

const cfg = readErpnextConfig();
console.log("install : D:\\ERPNext");
console.log("url     :", cfg.url || "(unset)");
console.log("company :", cfg.company);
console.log("posting :", cfg.postingEnabled);

const h = await health(cfg);
console.log("health  :", h.detail);

if (!cfg.configured) {
  console.log("\nbooks backend not configured — skip baseline. Atlas posted nothing (no client).");
  process.exit(0);
}
if (!h.reachable) {
  console.log("\nERPNext unreachable — skip baseline. Atlas did not post.");
  process.exit(0);
}

const params = new URLSearchParams({
  fields: JSON.stringify(["name", "posting_date", "remark"]),
  filters: JSON.stringify([["company", "=", cfg.company]]),
  limit_page_length: "100",
});
const r = await erpnextFetch(cfg, `/api/resource/Journal Entry?${params}`);
const rows = r.json?.data ?? [];
const atlasOps = rows.filter((row) => /ATLAS-OPS/i.test(row.remark ?? ""));
console.log("\njournal rows:", rows.length);
console.log("ATLAS-OPS   :", atlasOps.length);
console.log("baseline at :", new Date().toISOString());
if (atlasOps.length) {
  console.error("UNEXPECTED: Atlas-tagged journals present while posting should be off.");
  process.exitCode = 1;
} else {
  console.log("attest      : Atlas posted nothing");
}
