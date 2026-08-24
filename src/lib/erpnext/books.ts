import { capitalAccount, cashAccount, COMPANY_SPECS, expenseAccount, mainCostCenter, TRADING_COMPANIES } from "./companies";
import { ERP_SLOW_TIMEOUT_MS, erpnextFetch, ErpnextHttpError } from "./client";
import { readErpnextConfig } from "./config";
import {
  atlasOpsTitle,
  journalSubmitPayload,
  mockJeName,
  peekMockJe,
  toErpnextJournal,
  validateAtlasJournalPost,
  type AtlasJournalPost,
} from "./journal-post";
import type { BooksActionPayload, BooksBackend, BooksCompanyStatus, BooksResult } from "./types";

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
      await erpnextFetch("/api/method/frappe.ping", {}, cfg, ERP_SLOW_TIMEOUT_MS);
      const companies = await listCompanyStatus(cfg);
      const defaultRow = companies.find((c) => c.name === cfg.company);
      const missingSisters = TRADING_COMPANIES.filter((n) => !companies.find((c) => c.name === n && c.present));
      const dukiaReady = missingSisters.length === 0;
      const companyOk = Boolean(defaultRow?.present);
      const companyDetail = !companyOk
        ? `ERPNext answered but company "${cfg.company}" was not found`
        : dukiaReady
          ? `${cfg.company} reachable · DUKIA sisters present`
          : `${cfg.company} reachable · missing ${missingSisters.join(", ")} — create them in D:\\ERPNext (Accounting → Company). Names must match Atlas.`;
      return base(companyDetail, {
        ok: companyOk,
        configured: true,
        reachable: true,
        action: "health",
        companies,
        dukiaReady,
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
        const fresh = await erpnextFetch(`/api/resource/Journal Entry/${encodeURIComponent(name)}`, {}, cfg);
        const full = (fresh.json as { data?: Record<string, unknown> } | null)?.data;
        const payload = journalSubmitPayload(full);
        await erpnextFetch("/api/method/frappe.client.submit", {
          method: "POST",
          body: JSON.stringify(payload),
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

async function listCompanyStatus(cfg: ReturnType<typeof readErpnextConfig>): Promise<BooksCompanyStatus[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "abbr", "is_group", "parent_company"]),
    limit_page_length: "50",
  });
  let rows: Array<Record<string, unknown>> = [];
  try {
    const r = await erpnextFetch(`/api/resource/Company?${params}`, {}, cfg, ERP_SLOW_TIMEOUT_MS);
    rows = (r.json as { data?: Array<Record<string, unknown>> } | null)?.data ?? [];
  } catch {
    rows = [];
  }
  return COMPANY_SPECS.map((spec) => {
    const hit = rows.find((row) => String(row.name) === spec.name);
    return {
      name: spec.name,
      present: Boolean(hit),
      abbr: hit ? String(hit.abbr ?? spec.abbr) : spec.abbr,
      isGroup: hit ? Boolean(hit.is_group) : spec.isGroup,
      parent: hit?.parent_company ? String(hit.parent_company) : spec.parent,
      role: spec.role,
      project: spec.project,
    };
  });
}

function seededLeaves(company: string) {
  return [expenseAccount(company), cashAccount(company), capitalAccount(company)]
    .filter(Boolean)
    .map((name) => ({ name, isGroup: false }));
}

async function listLeafAccounts(company: string, cfg: ReturnType<typeof readErpnextConfig>) {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "is_group"]),
    filters: JSON.stringify([
      ["company", "=", company],
      ["is_group", "=", 0],
    ]),
    limit_page_length: "200",
    order_by: "name asc",
  });
  try {
    const r = await erpnextFetch(`/api/resource/Account?${params}`, {}, cfg, ERP_SLOW_TIMEOUT_MS);
    const rows = ((r.json as { data?: Array<{ name: string; is_group?: number }> } | null)?.data ?? []).map((row) => ({
      name: row.name,
      isGroup: Boolean(row.is_group),
    }));
    return rows.length ? rows : seededLeaves(company);
  } catch {
    return seededLeaves(company);
  }
}

async function listLeafCostCenters(company: string, cfg: ReturnType<typeof readErpnextConfig>) {
  const fallback = [{ name: mainCostCenter(company), company }];
  const params = new URLSearchParams({
    fields: JSON.stringify(["name", "company"]),
    filters: JSON.stringify([
      ["company", "=", company],
      ["is_group", "=", 0],
    ]),
    limit_page_length: "50",
    order_by: "name asc",
  });
  try {
    const r = await erpnextFetch(`/api/resource/Cost Center?${params}`, {}, cfg, ERP_SLOW_TIMEOUT_MS);
    const rows = ((r.json as { data?: Array<{ name: string; company?: string }> } | null)?.data ?? []).map((row) => ({
      name: row.name,
      company: row.company ?? company,
    }));
    return rows.length ? rows : fallback;
  } catch {
    return fallback;
  }
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
  if (action === "companies") {
    const cfg = readErpnextConfig();
    if (!cfg.configured) return { ...notConfigured(), action: "companies" };
    try {
      await erpnextFetch("/api/method/frappe.ping", {}, cfg, ERP_SLOW_TIMEOUT_MS);
      const companies = await listCompanyStatus(cfg);
      const missingSisters = TRADING_COMPANIES.filter((n) => !companies.find((c) => c.name === n && c.present));
      return base(
        missingSisters.length
          ? `Missing ${missingSisters.join(", ")}. Create in D:\\ERPNext desk — Atlas does not invent companies.`
          : "DUKIA sisters present. MOCK kept for smoke. Posting still off.",
        {
          action: "companies",
          ok: missingSisters.length === 0,
          configured: true,
          reachable: true,
          companies,
          dukiaReady: missingSisters.length === 0,
        },
      );
    } catch (err) {
      return { ...softFail(err), action: "companies" };
    }
  }
  if (action === "accounts") {
    const cfg = readErpnextConfig();
    const company = typeof payload.company === "string" && payload.company ? payload.company : cfg.company;
    if (!cfg.configured) {
      return base(`Seeded leaf names for ${company}. ERPNext not configured.`, {
        action: "accounts",
        ok: true,
        company,
        accounts: seededLeaves(company),
        costCenters: [{ name: mainCostCenter(company), company }],
      });
    }
    try {
      const accounts = await listLeafAccounts(company, cfg);
      return base(`${accounts.length} leaf accounts for ${company}`, {
        action: "accounts",
        ok: true,
        configured: true,
        reachable: true,
        company,
        accounts,
      });
    } catch (err) {
      return { ...softFail(err), action: "accounts", accounts: seededLeaves(company) };
    }
  }
  if (action === "cost-centers" || action === "costCenters") {
    const cfg = readErpnextConfig();
    const company = typeof payload.company === "string" && payload.company ? payload.company : cfg.company;
    if (!cfg.configured) {
      return base(`Seeded Main cost centre for ${company}.`, {
        action: "cost-centers",
        ok: true,
        company,
        costCenters: [{ name: mainCostCenter(company), company }],
      });
    }
    try {
      const costCenters = await listLeafCostCenters(company, cfg);
      return base(`${costCenters.length} leaf cost centres for ${company}`, {
        action: "cost-centers",
        ok: true,
        configured: true,
        reachable: true,
        company,
        costCenters,
      });
    } catch (err) {
      return { ...softFail(err), action: "cost-centers", costCenters: [{ name: mainCostCenter(company), company }] };
    }
  }
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
