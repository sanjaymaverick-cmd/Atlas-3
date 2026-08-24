import { erpnextAuthHeader, readErpnextConfig } from "./config";
import type { ErpnextConfig } from "./types";

const TIMEOUT_MS = 8_000;

export class ErpnextHttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`ERPNext HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function erpnextFetch(
  path: string,
  init: RequestInit = {},
  cfg: ErpnextConfig = readErpnextConfig(),
): Promise<{ status: number; json: unknown; text: string }> {
  if (!cfg.url) {
    throw new Error("books backend not configured");
  }
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const auth = erpnextAuthHeader(cfg);
  if (auth) headers.set("Authorization", auth);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}${path.startsWith("/") ? path : `/${path}`}`, {
      ...init,
      headers,
      signal: init.signal ?? ctrl.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) throw new ErpnextHttpError(res.status, text.slice(0, 400));
    return { status: res.status, json, text };
  } catch (err) {
    if (err instanceof ErpnextHttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`ERPNext at ${cfg.url} did not answer in ${TIMEOUT_MS}ms`);
    }
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(t);
  }
}
