#!/usr/bin/env node
/**
 * Ping ERPNext (D:\ERPNext) and, if Atlas is up, /api/books.
 * Read-only. Never posts.
 *
 *   node scripts/erpnext/smoke.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { health, readErpnextConfig, refusePost } from "./lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const envFile = join(HERE, ".env");
if (existsSync(envFile) && !process.env.ERPNEXT_URL) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1].startsWith("#")) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const ATLAS = process.env.ATLAS_URL || "http://127.0.0.1:8080";
const cfg = readErpnextConfig();

console.log("install : D:\\ERPNext  (sibling — never inside Atlas)");
console.log("upstream: https://github.com/frappe/erpnext");
console.log("url     :", cfg.url || "(unset)");
console.log("company :", cfg.company);
console.log("keys    :", cfg.apiKey ? "set" : "missing");
console.log("posting :", cfg.postingEnabled);
console.log("");

const h = await health(cfg);
console.log("erpnext :", h.ok ? "ok" : "soft-fail", "—", h.detail);

const post = await refusePost(cfg);
console.log("post    :", "refused —", post.detail);

let atlas = { ok: false, detail: "Atlas not reached" };
try {
  const res = await fetch(`${ATLAS}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "health" }),
    signal: AbortSignal.timeout(8000),
  });
  atlas = await res.json();
  console.log("atlas   :", `/api/books ${res.status}`, "—", atlas.detail);
} catch (err) {
  console.log("atlas   :", "soft-fail —", err.message, `(is npm run dev up on ${ATLAS}?)`);
}

const postingLeak = Boolean(atlas.posted?.length) || Boolean(h.posted?.length);
if (postingLeak) {
  console.error("FAIL: Atlas posted something. Never-post invariant broken.");
  process.exitCode = 1;
} else {
  console.log("attest  : Atlas posted nothing");
}
