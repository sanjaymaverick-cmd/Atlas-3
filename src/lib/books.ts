import type { BooksResult } from "./erpnext/types";

export type { BooksResult };

/**
 * Browser → Atlas `/api/books` → ERPNext REST.
 * Secrets never leave the server. Unset ERPNext env returns "not configured".
 */
export async function booksAgent(
  action = "health",
  extra: Record<string, unknown> = {},
): Promise<BooksResult> {
  try {
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = (await res.json()) as BooksResult;
    return {
      name: "erpnext",
      live: false,
      ok: Boolean(data.ok),
      configured: Boolean(data.configured),
      reachable: Boolean(data.reachable),
      action,
      company: data.company,
      detail: data.detail || (res.ok ? "ok" : `HTTP ${res.status}`),
      postingEnabled: data.postingEnabled,
      baselineCount: data.baselineCount,
      journal: data.journal,
      posted: data.posted ?? [],
      companies: data.companies,
      dukiaReady: data.dukiaReady,
      accounts: data.accounts,
      costCenters: data.costCenters,
    };
  } catch (err) {
    return {
      name: "erpnext",
      live: false,
      ok: false,
      configured: false,
      reachable: false,
      action,
      posted: [],
      detail: err instanceof Error ? err.message : "books backend unreachable",
    };
  }
}
