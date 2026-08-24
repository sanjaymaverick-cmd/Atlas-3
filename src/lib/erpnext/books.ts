import { erpnextFetch, ErpnextHttpError } from "./client";
import { readErpnextConfig } from "./config";
import {
  atlasOpsTitle,
  mockJeName,
  peekMockJe,
  toErpnextJournal,
  validateAtlasJournalPost,
  type AtlasJournalPost,
} from "./journal-post";
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
    const journal = parseJournalPayload(input);
    const invalid = journal ? validateAtlasJournalPost(journal) : "Typed AtlasJournalPost required (sourceId, company, postingDate, lines).";
    if (invalid) {
      return base(invalid, {
        action: "post",
        configured: cfg.configured,
        postingEnabled: cfg.postingEnabled,
        ok: false,
      });
    }
    const post = journal as AtlasJournalPost;
    if (!cfg.postingEnabled) {
      return base("Posting is off (ERPNEXT_POSTING_ENABLED=false). Atlas never posts uncontrolled vouchers.", {
        configured: cfg.configured,
        reachable: true,
        action: "post",
        ok: false,
        posted: [],
        postingEnabled: false,
      });
    }
    const title = atlasOpsTitle(post.sourceId);
    if (!cfg.configured) {
      const name = mockJeName(post.sourceId);
      return base(`Posting is on but ERPNext is not configured. Mock JE ${name} (not a live ledger).`, {
        ok: true,
        configured: false,
        reachable: false,
        action: "post",
        postingEnabled: true,
        posted: [{ name, title, mock: true, sourceId: post.sourceId }],
      });
    }
    try {
      const existing = await findJeByTitle(title, cfg);
      if (existing) {
        return base(`Idempotent: ${existing.name} already exists for ${title}`, {
          ok: true,
          configured: true,
          reachable: true,
          action: "post",
          postingEnabled: true,
          posted: [existing],
        });
      }
      const body = toErpnextJournal(post);
      const r = await erpnextFetch("/api/resource/Journal Entry", {
        method: "POST",
        body: JSON.stringify({ data: body }),
      }, cfg);
      const data = (r.json as { data?: { name?: string } } | null)?.data ?? (r.json as { name?: string } | null);
      const name = data?.name;
      if (!name) {
        return base("ERPNext accepted the insert but returned no Journal Entry name.", {
          configured: true,
          reachable: true,
          action: "post",
          postingEnabled: true,
          ok: false,
        });
      }
      try {
        await erpnextFetch("/api/method/frappe.client.submit", {
          method: "POST",
          body: JSON.stringify({ doc: { doctype: "Journal Entry", name } }),
        }, cfg);
      } catch (submitErr) {
        return base(
          `Journal Entry ${name} saved as draft. Submit/GL failed: ${submitErr instanceof Error ? submitErr.message : String(submitErr)}. Draft is not the ledger.`,
          {
            ok: false,
            configured: true,
            reachable: true,
            action: "post",
            postingEnabled: true,
            posted: [{ name, title, docstatus: 0 }],
          },
        );
      }
      return base(`${name} submitted · ${title}`, {
        ok: true,
        configured: true,
        reachable: true,
        action: "post",
        postingEnabled: true,
        posted: [{ name, title, docstatus: 1, sourceId: post.sourceId }],
      });
    } catch (err) {
      const name = peekMockJe(post.sourceId) ?? mockJeName(post.sourceId);
      return base(
        `ERPNext unreachable after posting was turned on. Mock JE ${name}. ${err instanceof Error ? err.message : String(err)}`,
        {
          ok: true,
          configured: cfg.configured,
          reachable: false,
          action: "post",
          postingEnabled: true,
          posted: [{ name, title, mock: true, sourceId: post.sourceId }],
        },
      );
    }
  },
};

function parseJournalPayload(input: Record<string, unknown>): AtlasJournalPost | null {
  const raw = (input.journal && typeof input.journal === "object" ? input.journal : input) as Record<string, unknown>;
  if (!raw.sourceId || !raw.company || !raw.postingDate || !Array.isArray(raw.lines)) return null;
  return {
    sourceId: String(raw.sourceId),
    company: String(raw.company),
    postingDate: String(raw.postingDate),
    userRemark: raw.userRemark ? String(raw.userRemark) : undefined,
    lines: raw.lines as AtlasJournalPost["lines"],
  };
}

async function findJeByTitle(title: string, cfg: ReturnType<typeof readErpnextConfig>) {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "docstatus", "title", "user_remark"]),
    filters: JSON.stringify([["title", "=", title]]),
    limit_page_length: "1",
  });
  const r = await erpnextFetch(`/api/resource/Journal Entry?${params}`, {}, cfg);
  const row = (r.json as { data?: Array<{ name: string; docstatus?: number; title?: string }> } | null)?.data?.[0];
  return row ?? null;
}

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
  if (action === "validate") {
    const cfg = readErpnextConfig();
    const journal = parseJournalPayload(payload as Record<string, unknown>);
    const invalid = journal ? validateAtlasJournalPost(journal) : "Typed AtlasJournalPost required.";
    return base(invalid ?? "Journal is balanced and ready. Posting is off until ERPNEXT_POSTING_ENABLED=true.", {
      action: "validate",
      ok: !invalid,
      configured: cfg.configured,
      postingEnabled: cfg.postingEnabled,
      reachable: true,
    });
  }
  if (action === "post" || action === "voucher") return { ...(await erpnextBooks.postJournal(payload as Record<string, unknown>)), action };
  return base(`Unknown books action: ${action}`, { action });
}
