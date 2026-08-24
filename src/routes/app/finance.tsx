import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { booksAgent, type BooksResult } from "@/lib/books";
import { canSeeBooks } from "@/lib/roles";
import { useAtlas } from "@/lib/store";
import {
  cashAccount,
  ENTITY_TO_COMPANY,
  expenseAccount,
  looksLikePnlAccount,
  looksLikeStockAccount,
  mainCostCenter,
} from "@/lib/erpnext/companies";
import { DUKIA_IC_PAIRS, ELIM_EXAMPLE, IC_CLOSE_STEPS } from "@/lib/erpnext/consolidation";
import { COMPANY_ALLOWLIST } from "@/lib/erpnext/journal-post";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/finance")({ component: Finance });

function Finance() {
  const { tally, entities, entityId, audit, settleTally, user, projects, fundingSanctions, addFundingSanction } = useAtlas();
  const [bank, setBank] = useState("SBI");
  const [sanctionNo, setSanctionNo] = useState("");
  const [loanPct, setLoanPct] = useState("60");
  const [amount, setAmount] = useState("");
  const [fundPid, setFundPid] = useState("");
  const [sanctionedAt, setSanctionedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [jeSource, setJeSource] = useState("ops-manual-1");
  const [jeCompany, setJeCompany] = useState<string>(ENTITY_TO_COMPANY[entityId] ?? "SATYAM BUILDCOM");
  const [jeDate, setJeDate] = useState(todayIso());
  const [jeDebitAcc, setJeDebitAcc] = useState(expenseAccount(ENTITY_TO_COMPANY[entityId] ?? "SATYAM BUILDCOM"));
  const [jeCreditAcc, setJeCreditAcc] = useState(cashAccount(ENTITY_TO_COMPANY[entityId] ?? "SATYAM BUILDCOM"));
  const [jeAmt, setJeAmt] = useState("1000");
  const [jeRemark, setJeRemark] = useState("Manual Finance post");
  const [jeCost, setJeCost] = useState(mainCostCenter(ENTITY_TO_COMPANY[entityId] ?? "SATYAM BUILDCOM"));
  const rows = tally.filter((t) => t.entityId === entityId);
  const entity = entities.find((e) => e.id === entityId);
  const [books, setBooks] = useState<BooksResult | null>(null);
  const [coa, setCoa] = useState<BooksResult | null>(null);
  const [centres, setCentres] = useState<BooksResult | null>(null);
  const [closeTicks, setCloseTicks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void booksAgent("health").then(setBooks);
  }, []);

  useEffect(() => {
    const mapped = ENTITY_TO_COMPANY[entityId];
    if (!mapped) return;
    setJeCompany(mapped);
  }, [entityId]);

  useEffect(() => {
    setJeDebitAcc(expenseAccount(jeCompany));
    setJeCreditAcc(cashAccount(jeCompany));
    setJeCost(mainCostCenter(jeCompany));
    void booksAgent("accounts", { company: jeCompany }).then((r) => {
      setCoa(r);
      const names = (r.accounts ?? []).map((a) => a.name).filter((n) => !looksLikeStockAccount(n));
      const expense = names.find((n) => /administrative expenses/i.test(n)) ?? names.find((n) => looksLikePnlAccount(n));
      const cash = names.find((n) => /^cash -/i.test(n));
      if (expense) setJeDebitAcc(expense);
      if (cash) setJeCreditAcc(cash);
    });
    void booksAgent("cost-centers", { company: jeCompany }).then((r) => {
      setCentres(r);
      const main = (r.costCenters ?? []).find((c) => /^main -/i.test(c.name)) ?? r.costCenters?.[0];
      if (main?.name) setJeCost(main.name);
    });
  }, [jeCompany]);

  if (!canSeeBooks(user?.role)) {
    return (
      <div>
        <PageHeader title="Company accounts" description="This login cannot touch the books. Local only." />
        <p className="text-sm text-muted">Site seats do not see accounts. Books stay with Finance and the Managing Director.</p>
      </div>
    );
  }

  const booksLine = !books
    ? "Checking ERPNext…"
    : !books.configured
      ? "Books backend not configured. Atlas still runs. See docs/finance/ERPNEXT.md."
      : !books.reachable
        ? `ERPNext unreachable (${books.detail}). Atlas still runs. Posting is off.`
        : `${books.company ?? "MOCK ATLAS3 LLP"} · ERPNext answered · posting ${books.postingEnabled ? "ON" : "off"}${
            books.dukiaReady === false ? " · DUKIA sisters missing" : books.dukiaReady ? " · DUKIA sisters present" : ""
          }`;

  const accountOptions = (coa?.accounts?.length
    ? coa.accounts.map((a) => a.name)
    : [expenseAccount(jeCompany), cashAccount(jeCompany)]
  ).filter((n) => n && !looksLikeStockAccount(n));
  const centreOptions = centres?.costCenters?.length
    ? centres.costCenters.map((c) => c.name)
    : [mainCostCenter(jeCompany)].filter(Boolean);

  function jePayload() {
    const amt = Number(jeAmt) || 0;
    const costFor = (account: string) => (looksLikePnlAccount(account) ? jeCost : undefined);
    return {
      sourceId: jeSource,
      company: jeCompany,
      postingDate: jeDate,
      userRemark: jeRemark,
      lines: [
        { account: jeDebitAcc, debit: amt, costCenter: costFor(jeDebitAcc) },
        { account: jeCreditAcc, credit: amt, costCenter: costFor(jeCreditAcc) },
      ],
    };
  }

  return (
    <div>
      <PageHeader
        kicker="Phase 9"
        title="Company accounts (ERPNext)"
        description="ERPNext at D:\ERPNext is the official book. Atlas never writes a voucher unless posting is explicitly turned on. We only match or flag a mismatch."
      />
      <GateBanner>
        Reconcile or accept an exception here. Books stay in ERPNext. Posting is off by default. Local only — not live.
      </GateBanner>
      <Card className="mb-6 p-5">
        <p className="text-sm text-muted">Legal entity</p>
        <p className="font-display text-2xl">{entity?.name}</p>
        <p className="text-sm tabular-nums text-muted">{entity?.gstin}</p>
        <p className="mt-3 text-sm text-muted">{booksLine}</p>
        {books?.companies?.length ? (
          <ul className="mt-4 space-y-1 text-sm">
            {books.companies.map((c) => (
              <li key={c.name} className="flex flex-wrap justify-between gap-2">
                <span>
                  {c.name}
                  {c.project ? ` · ${c.project}` : c.role === "group" ? " · group" : c.role === "mock" ? " · smoke" : ""}
                </span>
                <span className="tabular-nums text-muted">
                  {c.present ? `in ERPNext · ${c.abbr}` : "missing in ERPNext"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <h2 className="mb-3 font-display text-2xl">Intercompany (group pack, not entity books)</h2>
      <p className="mb-3 text-sm text-muted">
        Each LLP keeps due-from / due-to. Adding the three trial balances overstates assets and liabilities. Elimination
        is a period-end worksheet for MD / silent partners — Atlas does not reverse IC JEs on the sisters. See
        docs/finance/CONSOLIDATION.md.
      </p>
      <Card className="mb-6 p-5">
        <p className="text-sm">
          Example: {ELIM_EXAMPLE.a} Dr {ELIM_EXAMPLE.amountInr.toLocaleString("en-IN")} due from {ELIM_EXAMPLE.b}; the
          other Cr the same. Standalone both correct. Group elim nets to zero. {ELIM_EXAMPLE.note}
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {DUKIA_IC_PAIRS.map((p) => (
            <li key={`${p.a}-${p.b}`} className="rounded-md border border-line px-3 py-2">
              <p className="font-medium">
                {p.a} ↔ {p.b}
              </p>
              <p className="text-xs text-muted">
                {p.dueFromA} vs {p.dueToB}
                <br />
                {p.dueFromB} vs {p.dueToA}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-muted">Close checklist (this browser only)</p>
        <ul className="mt-2 space-y-2 text-sm">
          {IC_CLOSE_STEPS.map((step) => (
            <li key={step} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={Boolean(closeTicks[step])}
                onChange={() => setCloseTicks((cur) => ({ ...cur, [step]: !cur[step] }))}
              />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mb-3 font-display text-2xl">Construction finance (ops master)</h2>
      <p className="mb-3 text-sm text-muted">Bank, sanction number, and 60/40 split live here — not in a PDF title. This is not an ERPNext voucher.</p>
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={fundPid || projects.find((p) => p.entityId === entityId)?.id || ""}
            onChange={(e) => setFundPid(e.target.value)}
          >
            {projects
              .filter((p) => p.entityId === entityId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Bank">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={bank} onChange={(e) => setBank(e.target.value)}>
            <option>SBI</option>
            <option>AU Small Finance Bank</option>
            <option>HDFC</option>
            <option>ICICI</option>
          </select>
        </Field>
        <Field label="Sanction number">
          <Input value={sanctionNo} onChange={(e) => setSanctionNo(e.target.value)} placeholder="SBI/JPR/2024/…" />
        </Field>
        <Field label="Loan % (rest is partners + advances)">
          <Input type="number" value={loanPct} onChange={(e) => setLoanPct(e.target.value)} />
        </Field>
        <Field label="Sanction amount (₹)">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Sanction date">
          <Input type="date" value={sanctionedAt} onChange={(e) => setSanctionedAt(e.target.value)} />
        </Field>
        <Field label="Valid until (optional)">
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button
            onClick={() => {
              const pid = fundPid || projects.find((p) => p.entityId === entityId)?.id || "";
              const loan = Number(loanPct) || 0;
              const err = addFundingSanction({
                projectId: pid,
                bank,
                sanctionNo,
                loanPct: loan,
                equityPct: 100 - loan,
                amount: Number(amount) || 0,
                sanctionedAt: sanctionedAt || undefined,
                validUntil: validUntil || undefined,
              });
              toast(err ?? "Sanction recorded on the project.");
              if (!err) setSanctionNo("");
            }}
          >
            Record sanction
          </Button>
        </div>
      </Card>
      <div className="mb-8 space-y-2">
        {fundingSanctions
          .filter((f) => projects.find((p) => p.id === f.projectId)?.entityId === entityId)
          .map((f) => {
            const p = projects.find((x) => x.id === f.projectId);
            return (
              <Card key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {f.bank} · {p?.name}
                  </p>
                  <p className="text-sm text-muted">
                    {f.sanctionNo} · {f.loanPct}/{f.equityPct} · {inr(f.amount, true)}
                    {f.sanctionedAt ? ` · from ${f.sanctionedAt}` : ""}
                  </p>
                </div>
                <Status value={f.status} />
              </Card>
            );
          })}
      </div>

      <div className="space-y-3">
        {rows.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-sm tabular-nums text-muted">{inr(t.amount)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={t.status} />
              {t.status === "open" || t.status === "review" ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      settleTally(t.id, "reconciled");
                      toast("Reconciled in Atlas. ERPNext remains the books — no voucher posted.");
                    }}
                  >
                    Reconcile
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => settleTally(t.id, "exception")}>Accept exception</Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl">Post a journal to ERPNext</h2>
      <p className="mb-3 text-sm text-muted">
        Leaf accounts from <em>this</em> company’s CoA. P&amp;L lines use cost centre Main - ABBR. Submit posts GL; a
        draft is not the ledger. Posting stays off unless ERPNEXT_POSTING_ENABLED is true. Land, bookings, POs and CEO
        never post. Atlas does not create ERPNext companies.
      </p>
      <Card className="mb-8 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="sourceId (idempotency)">
          <Input value={jeSource} onChange={(e) => setJeSource(e.target.value)} />
        </Field>
        <Field label="Company (must exist in ERPNext)">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={jeCompany} onChange={(e) => setJeCompany(e.target.value)}>
            {COMPANY_ALLOWLIST.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Posting date">
          <Input type="date" value={jeDate} onChange={(e) => setJeDate(e.target.value)} />
        </Field>
        <Field label="Amount (₹, 2 decimals)">
          <Input type="number" step="0.01" value={jeAmt} onChange={(e) => setJeAmt(e.target.value)} />
        </Field>
        <Field label="Debit (leaf)">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={jeDebitAcc} onChange={(e) => setJeDebitAcc(e.target.value)}>
            {accountOptions.map((a) => (
              <option key={`d-${a}`} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Credit (leaf)">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={jeCreditAcc} onChange={(e) => setJeCreditAcc(e.target.value)}>
            {accountOptions.map((a) => (
              <option key={`c-${a}`} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cost centre (P&L → Main - ABBR)">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={jeCost} onChange={(e) => setJeCost(e.target.value)}>
            {centreOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Remark">
          <Input value={jeRemark} onChange={(e) => setJeRemark(e.target.value)} />
        </Field>
        <p className="sm:col-span-2 text-xs text-muted">
          {coa?.detail ?? "CoA"} · {centres?.detail ?? "cost centres"}. Group company DUKIA GROUP is not on the post
          allowlist.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const r = await booksAgent("validate", jePayload());
              toast(r.detail);
            }}
          >
            Check journal
          </Button>
          <Button
            onClick={async () => {
              const r = await booksAgent("post", jePayload());
              toast(r.detail);
            }}
          >
            Submit to ERPNext (posts GL)
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 mt-8 font-display text-2xl">Recent audit</h2>
      <div className="space-y-2">
        {audit.slice(0, 8).map((a) => (
          <div key={a.id} className="rounded-md border border-line px-4 py-3 text-sm">
            <p>
              {a.actor} — {a.action}
            </p>
            <p className="text-xs text-muted">{a.entity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
