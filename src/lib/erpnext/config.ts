import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ErpnextConfig } from "./types";

let loadedDotEnv = false;

/** Server-only. Never VITE_. Missing file is fine — Atlas still boots. */
function applyDotEnv(env: Record<string, string | undefined>) {
  if (env !== process.env) return;
  if (loadedDotEnv) return;
  loadedDotEnv = true;
  if (env.ERPNEXT_URL) return;
  const file = join(process.cwd(), "scripts", "erpnext", ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1].startsWith("#")) continue;
    if (env[m[1]]) continue;
    env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

/**
 * Server-only. Do not import from a client route — secrets are not VITE_.
 * Unset env means Atlas boots with books "not configured".
 */
export function readErpnextConfig(
  env: Record<string, string | undefined> = process.env,
): ErpnextConfig {
  applyDotEnv(env);
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
