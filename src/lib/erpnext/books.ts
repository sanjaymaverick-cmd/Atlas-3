import { erpnextFetch, ErpnextHttpError } from "./client";
import { readErpnextConfig } from "./config";
import type { BooksActionPayload, BooksBackend, BooksResult } from "./types";

const NAME = "erpnext" as const;

function base(detail: string, extra: Partial<BooksResult> = {}): BooksResult {
  const cfg = readErpnextConfig();
  return {
    name: NAME,
    ok: false,
    configured: cfg.configured,
    reachable: false,
    live: false,
    company: cfg.company,
    postingEnabled: cfg.postingEnabled,
    posted: [],
    detail,
    ...extra,
  };
}

function notConfigured(): BooksResult {
  return base("books backend not configured — set ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET");
}

function softFail(err: unknown): BooksResult {
  const cfg = readErpnextConfig();
  const detail =
    err instanceof ErpnextHttpError
      ? `ERPNext HTTP ${err.status}`
      : err instanceof Error
        ? err.message
        : String(err);
  return base(detail, { configured: cfg.configured, reachable: false });
}

export const erpnextBooks: BooksBackend = {
  name: NAME,

  async health() {
    const cfg = readErpnextConfig();
    if (!cfg.configured) return notConfigured();
    try {
      await erpnextFetch("/api/method/frappe.ping", {}, cfg);
      let companyOk = true;
      let companyDetail = `${cfg.company} reachable`;
      try {
        await erpnextFetch(`/api/resource/Company/${encodeURIComponent(cfg.company)}`, {}, cfg);
      } catch {
        companyOk = false;
        companyDetail = `ERPNext answered but company "${cfg.company}" was not found`;
      }
      return base(companyDetail, {
        ok: companyOk,
        configured: true,
        reachable: true,
        action: "health",
      });
    } catch (err) {
      return softFail(err);
    }
  },

  async baselineCount() {
    const cfg = readErpnextConfig();
    if (!cfg.configured) return notConfigured();
    try {
      const r = await erpnextFetch("/api/method/frappe.client.get_count", {
        method: "POST",
        body: JSON.stringify({ doctype: "GL Entry", filters: { company: cfg.company } }),
      }, cfg);
      const n = Number((r.json as { message?: number } | null)?.message ?? 0);
      return base(`GL Entry count for ${cfg.company}: ${n}`, {
        ok: true,
        configured: true,
        reachable: true,
        action: "baseline",
        baselineCount: n,
      });
    } catch (err) {
      return softFail(err);
    }
  },

  async journal(limit = 20) {
    const cfg = readErpnextConfig();
    if (!cfg.configured) return notConfigured();
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify(["name", "posting_date", "remark", "title"]),
        filters: JSON.stringify([
          ["company", "=", cfg.company],
        ]),
        limit_page_length: String(limit),
        order_by: "posting_date desc",
      });
      const r = await erpnextFetch(`/api/resource/Journal Entry?${params}`, {}, cfg);
      const rows = ((r.json as { data?: Array<Record<string, string>> } | null)?.data ?? []).map((row) => ({
        name: row.name,
        posting_date: row.posting_date,
        remarks: row.remark ?? row.title,
      }));
      const atlasPosted = rows.filter((row) => /ATLAS-OPS/i.test(row.remarks ?? ""));
      return base(`${rows.length} journal rows; ${atlasPosted.length} ATLAS-OPS`, {
        ok: true,
        configured: true,
        reachable: true,
        action: "journal",
        journal: rows,
        posted: atlasPosted,
        baselineCount: rows.length,
      });
    } catch (err) {
      return softFail(err);
    }
  },

  async postJournal(input) {
    const cfg = readErpnextConfig();
    if (!cfg.configured) return notConfigured();
    if (!cfg.postingEnabled) {
      return base("Posting is off (ERPNEXT_POSTING_ENABLED=false). Atlas never posts uncontrolled vouchers.", {
        configured: true,
        reachable: true,
        action: "post",
        ok: false,
        posted: [],
      });
    }
    try {
      const r = await erpnextFetch("/api/resource/Journal Entry", {
        method: "POST",
        body: JSON.stringify({ data: input }),
      }, cfg);
      return base("posted", {
        ok: true,
        configured: true,
        reachable: true,
        action: "post",
        posted: [r.json],
      });
    } catch (err) {
      return softFail(err);
    }
  },
};

/** Vite `/api/books` and company-day use this. Posting is off unless the flag is true. */
export async function handleBooksAction(payload: BooksActionPayload = {}): Promise<BooksResult> {
  const action = payload.action || "health";
  if (action === "health" || action === "ping" || action === "company-day") {
    const health = await erpnextBooks.health();
    if (action === "company-day") {
      const journal = health.ok ? await erpnextBooks.journal(50) : health;
      const posted = journal.posted ?? [];
      return {
        ...health,
        action: "company-day",
        ok: health.ok,
        posted,
        journal: journal.journal,
        baselineCount: journal.baselineCount,
        detail: !health.configured
          ? health.detail
          : !health.reachable
            ? health.detail
            : posted.length
              ? `ERPNext journal has ${posted.length} ATLAS-OPS row(s) — unexpected`
              : `${health.company} is open. Atlas did not post.`,
      };
    }
    return { ...health, action };
  }
  if (action === "baseline") return { ...(await erpnextBooks.baselineCount()), action };
  if (action === "journal") return { ...(await erpnextBooks.journal(Number(payload.limit) || 20)), action };
  if (action === "post" || action === "voucher") return { ...(await erpnextBooks.postJournal(payload)), action };
  return base(`Unknown books action: ${action}`, { action });
}
