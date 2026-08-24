import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { booksAgent, type BooksResult } from "@/lib/books";
import { buildCeoReport } from "@/lib/ceo";
import { useAtlas } from "@/lib/store";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/ceo")({ component: CeoDesk });

function CeoDesk() {
  const store = useAtlas();
  const { entities, entityId, projectId, projects, simDate } = store;
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
      ),
    [store, scope, entityId, projectId, books],
  );
  const k = report.kpis;
  const asOf = simDate || todayIso();

  return (
    <div>
      <PageHeader
        kicker="CEO"
        title="Group pulse"
        description={`As of ${asOf} (trial clock). Commission accrues only. Atlas does not pay and does not post ERPNext from this screen.`}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["group", "Group"],
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/app/sales/inventory">
          <Kpi label="Available" value={String(k.available)} vs={k.availableInr ? inr(k.availableInr, true) : undefined} />
        </Link>
        <Link to="/app/sales/channel">
          <Kpi label="Held" value={String(k.held)} />
        </Link>
        <Link to="/app/customers">
          <Kpi label="Booked / sold" value={String(k.booked)} vs={k.bookedInr ? inr(k.bookedInr, true) : undefined} />
        </Link>
        <Link to="/app/sales/handover">
          <Kpi label="Possessed" value={String(k.possessed)} />
        </Link>
        <Link to="/app/customers">
          <Kpi label="Collections this month" value={inr(k.collectionsMtd, true)} hint="Instalments due this month that have a paid amount" />
        </Link>
        <Link to="/app/customers">
          <Kpi
            label="Overdue 61–90 / 90d+"
            value={`${k.overdue61} / ${k.overdue90}`}
            tone={k.overdue90 ? "danger" : k.overdue61 ? "warn" : "ok"}
          />
        </Link>
        <Link to="/app/land">
          <Kpi label="Open gates" value={String(k.openDiligence + k.reraDue + k.snagsOpen)} vs={`title ${k.openDiligence} · RERA ${k.reraDue} · defects ${k.snagsOpen}`} />
        </Link>
        <Link to="/app/crm">
          <Kpi label="Commission accrued" value={inr(k.commissionAccrued, true)} hint="Never paid from Atlas" />
        </Link>
        <Link to="/app/land">
          <Kpi label="Capital deployed (land)" value={k.capitalDeployed ? inr(k.capitalDeployed, true) : "₹ —"} />
        </Link>
        <Link to="/app/commercial">
          <Kpi label="Open PO exposure" value={inr(k.openPoInr, true)} vs={k.vendorsApproval ? `${k.vendorsApproval} vendor(s) in approval` : "vendors Active"} />
        </Link>
        <Link to="/app/finance">
          <Kpi
            label="Books health"
            value={!books ? "…" : !books.configured ? "Not set" : books.reachable ? "Reachable" : "Down"}
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
                  <Link to={r.to} className="block rounded-md border border-line px-3 py-2 text-sm hover:bg-chip">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-display text-2xl">Brief</h2>
          <p className="mt-1 text-xs text-muted">Five bullets from these numbers. No external model.</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {report.brief.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
