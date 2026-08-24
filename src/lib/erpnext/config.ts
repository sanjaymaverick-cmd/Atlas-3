import type { ErpnextConfig } from "./types";

/**
 * Server-only. Do not import from a client route — secrets are not VITE_.
 * Unset env means Atlas boots with books "not configured".
 */
export function readErpnextConfig(env: Record<string, string | undefined> = process.env): ErpnextConfig {
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

export function erpnextAuthHeader(cfg: ErpnextConfig): string | null {
  if (!cfg.apiKey || !cfg.apiSecret) return null;
  return `token ${cfg.apiKey}:${cfg.apiSecret}`;
}
