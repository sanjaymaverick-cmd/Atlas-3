/**
 * Node twin of `src/lib/erpnext/*` for operator scripts (no Vite).
 * Atlas talks to ERPNext at D:\ERPNext by REST only. Never vendors the app.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function loadDotEnv(file = join(dirname(fileURLToPath(import.meta.url)), ".env")) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1].startsWith("#")) continue;
    if (process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function readErpnextConfig(env = process.env) {
  const url = (env.ERPNEXT_URL ?? "").trim().replace(/\/$/, "");
  const apiKey = (env.ERPNEXT_API_KEY ?? "").trim();
  const apiSecret = (env.ERPNEXT_API_SECRET ?? "").trim();
  const company = (env.ERPNEXT_COMPANY ?? "MOCK ATLAS3 LLP").trim() || "MOCK ATLAS3 LLP";
  const postingEnabled = /^(1|true|yes)$/i.test(env.ERPNEXT_POSTING_ENABLED ?? "");
  return {
    url,
    apiKey,
    apiSecret,
    company,
    postingEnabled,
    configured: Boolean(url && apiKey && apiSecret),
  };
}

const TIMEOUT_MS = 8_000;
export const ERP_SLOW_TIMEOUT_MS = 20_000;
export const ERP_CREATE_TIMEOUT_MS = 180_000;

export async function erpnextFetch(cfg, path, init = {}, timeoutMs = TIMEOUT_MS) {
  if (!cfg.url) throw new Error("books backend not configured");
  const headers = { Accept: "application/json", ...(init.headers ?? {}) };
  if (cfg.apiKey && cfg.apiSecret) headers.Authorization = `token ${cfg.apiKey}:${cfg.apiSecret}`;
  if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(`${cfg.url}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(`ERPNext HTTP ${res.status}`);
    err.status = res.status;
    err.body = text.slice(0, 400);
    throw err;
  }
  return { status: res.status, json, text };
}

export async function health(cfg = readErpnextConfig()) {
  if (!cfg.configured) {
    return {
      name: "erpnext",
      ok: false,
      configured: false,
      reachable: false,
      live: false,
      posted: [],
      company: cfg.company,
      postingEnabled: cfg.postingEnabled,
      detail: "books backend not configured — set ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET",
    };
  }
  try {
    await erpnextFetch(cfg, "/api/method/frappe.ping", {}, ERP_SLOW_TIMEOUT_MS);
    let companyOk = true;
    let detail = `${cfg.company} reachable`;
    try {
      await erpnextFetch(cfg, `/api/resource/Company/${encodeURIComponent(cfg.company)}`, {}, ERP_SLOW_TIMEOUT_MS);
    } catch {
      companyOk = false;
      detail = `ERPNext answered but company "${cfg.company}" was not found`;
    }
    return {
      name: "erpnext",
      ok: companyOk,
      configured: true,
      reachable: true,
      live: false,
      posted: [],
      company: cfg.company,
      postingEnabled: cfg.postingEnabled,
      detail,
    };
  } catch (err) {
    return {
      name: "erpnext",
      ok: false,
      configured: true,
      reachable: false,
      live: false,
      posted: [],
      company: cfg.company,
      postingEnabled: cfg.postingEnabled,
      detail: err?.message || String(err),
    };
  }
}

export async function refusePost(cfg = readErpnextConfig()) {
  if (!cfg.postingEnabled) {
    return {
      ok: false,
      posted: [],
      detail: "Posting is off (ERPNEXT_POSTING_ENABLED=false). Atlas never posts uncontrolled vouchers.",
    };
  }
  return { ok: false, posted: [], detail: "operator scripts do not post" };
}
