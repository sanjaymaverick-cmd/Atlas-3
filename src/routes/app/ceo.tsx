import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { booksAgent, type BooksResult } from "@/lib/books";
import { buildCeoReport } from "@/lib/ceo";
import { COMPANY_SPECS } from "@/lib/erpnext/companies";
import { isThirdParty } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/ceo")({ component: CeoDesk });

function CeoDesk() {
  const store = useAtlas();
  const { entities, entityId, projectId, projects, simDate, user } = store;
  const [scope, setScope] = useState<"group" | "entity" | "project">("group");
  const [books, setBooks] = useState<BooksResult | null>(null);

  useEffect(() => {
    void booksAgent("health").then(setBooks);
  }, []);

  const report = useMemo(
    () =>
      buildCeoReport(
        store,
        scope === "group" ? "group" : scope === "project" ? { projectId } : { entityId },
        books
          ? {
              configured: books.configured,
              reachable: books.reachable,
              posted: books.posted?.length ?? 0,
            }
          : undefined,
        entityId,
      ),
    [store, scope, entityId, projectId, books],
  );
  const k = report.kpis;
  const asOf = simDate || todayIso();
  const sisters = useMemo(
    () =>
      COMPANY_SPECS.filter((c) => c.role === "trading" && c.entityId).map((c) => ({
        spec: c,
        report: buildCeoReport(
          store,
          { entityId: c.entityId },
          books
            ? {
                configured: books.configured,
                reachable: books.reachable,
                posted: books.posted?.length ?? 0,
              }
            : undefined,
          entityId,
        ),
      })),
    [store, books, entityId],
  );

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        kicker="CEO"
        title="Group pulse"
        description={`As of ${asOf} (trial clock). Commission accrues only. Atlas does not pay and does not post ERPNext from this screen. The Group toggle is ops across three LLPs — not a consolidated P&L after intercompany elimination.`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["group", "Group (ops, not post-elim)"],
            ["entity", entities.find((e) => e.id === entityId)?.name ?? "This company"],
            ["project", projects.find((p) => p.id === projectId)?.name ?? "This project"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`h-11 rounded-md border px-3 text-sm ${scope === id ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface"}`}
            onClick={() => setScope(id)}
            disabled={id === "project" && projectId === "all"}
          >
            {label}
          </button>
        ))}
      </div>

      {scope === "group" ? (
        <div className="mb-6 grid gap-3 lg:grid-cols-3">
          {sisters.map(({ spec, report: sr }) => (
            <Card key={spec.name} className="p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{spec.project}</p>
              <p className="font-display text-xl">{spec.name}</p>
              <p className="mt-2 text-sm tabular-nums">
                {sr.kpis.booked} booked · {inr(sr.kpis.bookedInr, true)}
              </p>
              <p className="text-sm tabular-nums text-muted">
                Collections {inr(sr.kpis.collectionsMtd, true)} · land{" "}
                {sr.kpis.capitalDeployed ? inr(sr.kpis.capitalDeployed, true) : "₹ —"}
              </p>
            </Card>
          ))}
        </div>
      ) : null}
      {scope === "group" ? (
        <p className="mb-6 text-sm text-muted">
          Each card is that LLP’s ops. Adding them does not eliminate due-from/due-to. Statutory
          books live in ERPNext Desk (DUKIA Books) — not this screen. Group pack after elim is a
          worksheet, not these three cards.{" "}
          <Link to="/app/finance" className="underline-offset-4 hover:underline">
            Company accounts (ops hint)
          </Link>
          .
        </p>
      ) : null}

      {report.mdWaiting > 0 ? (
        <Link
          to="/app/approvals"
          className="mb-6 block rounded-xl border border-primary/40 bg-surface p-4"
        >
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            Waiting on the Managing Director
          </p>
          <p className="font-display text-2xl">
            {report.mdWaiting} approval{report.mdWaiting === 1 ? "" : "s"}
          </p>
        </Link>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/app/sales/inventory">
          <Kpi
            label="Available"
            value={String(k.available)}
            vs={k.availableInr ? inr(k.availableInr, true) : undefined}
          />
        </Link>
        <Link to="/app/sales/channel">
          <Kpi label="Held" value={String(k.held)} />
        </Link>
        <Link to="/app/customers">
          <Kpi
            label="Booked / sold"
            value={String(k.booked)}
            vs={k.bookedInr ? inr(k.bookedInr, true) : undefined}
          />
        </Link>
        <Link to="/app/sales/handover">
          <Kpi label="Possessed" value={String(k.possessed)} />
        </Link>
        <Link to="/app/customers">
          <Kpi
            label="Collections this month"
            value={inr(k.collectionsMtd, true)}
            hint="Instalments due this month that have a paid amount"
          />
        </Link>
        <Link to="/app/customers">
          <Kpi
            label="Overdue 61–90 / 90d+"
            value={`${k.overdue61} / ${k.overdue90}`}
            tone={k.overdue90 ? "danger" : k.overdue61 ? "warn" : "ok"}
          />
        </Link>
        <Link to="/app/land">
          <Kpi
            label="Open gates"
            value={String(k.openDiligence + k.reraDue + k.snagsOpen)}
            vs={`title ${k.openDiligence} · RERA ${k.reraDue} · defects ${k.snagsOpen}`}
          />
        </Link>
        <Link to="/app/crm">
          <Kpi
            label="Commission accrued"
            value={inr(k.commissionAccrued, true)}
            hint="Never paid from Atlas"
          />
        </Link>
        <Link to="/app/land">
          <Kpi
            label="Capital deployed (land)"
            value={k.capitalDeployed ? inr(k.capitalDeployed, true) : "₹ —"}
          />
        </Link>
        <Link to="/app/commercial">
          <Kpi
            label="Open PO exposure"
            value={inr(k.openPoInr, true)}
            vs={k.vendorsApproval ? `${k.vendorsApproval} vendor(s) in approval` : "vendors Active"}
          />
        </Link>
        <Kpi
          label="Weeks to sellout"
          value={report.weeksToSellout != null ? String(report.weeksToSellout) : "—"}
          vs={report.weeklyVelocity ? `${report.weeklyVelocity} bookings/week` : "no pace yet"}
        />
        <Link to="/app/finance">
          <Kpi
            label="Books health"
            value={
              !books ? "…" : !books.configured ? "Not set" : books.reachable ? "Reachable" : "Down"
            }
            vs={books?.detail}
            hint="Atlas posted nothing unless posting is on"
          />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-2xl">Risk queue</h2>
          {report.risks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing in the deterministic queue.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {report.risks.map((r) => (
                <li key={r.id}>
                  <Link
                    to={r.to}
                    className="block rounded-md border border-line px-3 py-2 text-sm hover:bg-chip"
                  >
                    <span className="mr-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                      {r.severity}
                    </span>
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-2xl">Brief</h2>
          <p className="mt-1 text-xs text-muted">
            Five bullets from these numbers. No external model.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {report.brief.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-display text-xl">Funnel</h2>
          <p className="text-xs text-muted">
            Available → held → booked → possessed. Ops inventory, not books after elim.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {report.funnel.map((f) => {
              const max = Math.max(1, ...report.funnel.map((x) => x.count));
              const label =
                f.stage === "available"
                  ? "Available"
                  : f.stage === "held"
                    ? "Held"
                    : f.stage === "booked"
                      ? "Booked"
                      : "Possessed";
              return (
                <li key={f.stage}>
                  <div className="flex justify-between gap-2">
                    <span>{label}</span>
                    <span className="tabular-nums">{f.count}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-chip">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.round((f.count / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Velocity & collections</h2>
          <p className="mt-3 text-sm tabular-nums">{report.weeklyVelocity} bookings / week (ops)</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-chip">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(100, Math.round(report.weeklyVelocity * 10))}%` }}
            />
          </div>
          <p className="mt-3 text-sm tabular-nums">
            Collections this month {inr(k.collectionsMtd, true)}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-chip">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, k.bookedInr ? Math.round((k.collectionsMtd / k.bookedInr) * 100) : 0)}%`,
              }}
            />
          </div>
          <p className="mt-3 text-sm tabular-nums">
            Aging 61–90d {k.overdue61} · 90d+ {k.overdue90}
          </p>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-chip">
            <div
              className="h-full bg-warn"
              style={{ width: `${Math.min(50, k.overdue61 * 8)}%` }}
            />
            <div
              className="h-full bg-danger"
              style={{ width: `${Math.min(50, k.overdue90 * 8)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Not P&L after intercompany elimination. Books sit in ERPNext.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-xl">Inventory by BHK</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {report.bhk.map((b) => (
              <li key={b.config} className="flex justify-between gap-2">
                <span>{b.config}</span>
                <span className="tabular-nums">
                  {b.available} free · {b.booked} booked
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
