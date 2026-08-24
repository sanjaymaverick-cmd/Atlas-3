/**
 * Node twin of `src/lib/erpnext/*` for operator scripts (no Vite).
 * Atlas talks to ERPNext at D:\ERPNext by REST only. Never vendors the app.
 */

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

export async function erpnextFetch(cfg, path, init = {}) {
  if (!cfg.url) throw new Error("books backend not configured");
  const headers = { Accept: "application/json", ...(init.headers ?? {}) };
  if (cfg.apiKey && cfg.apiSecret) headers.Authorization = `token ${cfg.apiKey}:${cfg.apiSecret}`;
  if (init.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(`${cfg.url}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS),
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
    await erpnextFetch(cfg, "/api/method/frappe.ping");
    let companyOk = true;
    let detail = `${cfg.company} reachable`;
    try {
      await erpnextFetch(cfg, `/api/resource/Company/${encodeURIComponent(cfg.company)}`);
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
