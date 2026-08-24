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
  const [jeCompany, setJeCompany] = useState("SATYAM BUILDCOM");
  const [jeDate, setJeDate] = useState(todayIso());
  const [jeDebitAcc, setJeDebitAcc] = useState("Construction Expenses - SBC");
  const [jeCreditAcc, setJeCreditAcc] = useState("Cash - SBC");
  const [jeAmt, setJeAmt] = useState("1000");
  const [jeRemark, setJeRemark] = useState("Manual Finance post");
  const rows = tally.filter((t) => t.entityId === entityId);
  const entity = entities.find((e) => e.id === entityId);
  const [books, setBooks] = useState<BooksResult | null>(null);

  useEffect(() => {
    void booksAgent("health").then(setBooks);
  }, []);

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
        : `${books.company ?? "MOCK ATLAS3 LLP"} · ERPNext answered · posting ${books.postingEnabled ? "ON" : "off"}`;

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
        Explicit Finance action only. Posting stays off unless ERPNEXT_POSTING_ENABLED is true. Land, bookings, POs and CEO never post.
      </p>
      <Card className="mb-8 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="sourceId (idempotency)">
          <Input value={jeSource} onChange={(e) => setJeSource(e.target.value)} />
        </Field>
        <Field label="Company">
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
        <Field label="Amount (₹)">
          <Input type="number" value={jeAmt} onChange={(e) => setJeAmt(e.target.value)} />
        </Field>
        <Field label="Debit account">
          <Input value={jeDebitAcc} onChange={(e) => setJeDebitAcc(e.target.value)} />
        </Field>
        <Field label="Credit account">
          <Input value={jeCreditAcc} onChange={(e) => setJeCreditAcc(e.target.value)} />
        </Field>
        <Field label="Remark">
          <Input value={jeRemark} onChange={(e) => setJeRemark(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const amt = Number(jeAmt) || 0;
              const r = await booksAgent("validate", {
                sourceId: jeSource,
                company: jeCompany,
                postingDate: jeDate,
                userRemark: jeRemark,
                lines: [
                  { account: jeDebitAcc, debit: amt },
                  { account: jeCreditAcc, credit: amt },
                ],
              });
              toast(r.detail);
            }}
          >
            Check journal
          </Button>
          <Button
            onClick={async () => {
              const amt = Number(jeAmt) || 0;
              const r = await booksAgent("post", {
                sourceId: jeSource,
                company: jeCompany,
                postingDate: jeDate,
                userRemark: jeRemark,
                lines: [
                  { account: jeDebitAcc, debit: amt },
                  { account: jeCreditAcc, credit: amt },
                ],
              });
              toast(r.detail);
            }}
          >
            Post to ERPNext
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
