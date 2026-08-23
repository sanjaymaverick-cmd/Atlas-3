import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CashBars } from "@/components/cash-bars";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { ProjectTimeline } from "@/components/project-timeline";
import { Status } from "@/components/status";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { useHasMounted } from "@/lib/hydrated";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: Command });

function Command() {
  const mounted = useHasMounted();
  const {
    projects,
    entityId,
    projectId,
    approvals,
    bookings,
    tally,
    inspections,
    changes,
    decisions,
    obligations,
    emis,
  } = useAtlas();
  const list = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const budget = list.reduce((s, p) => s + p.budget, 0);
  const spent = list.reduce((s, p) => s + p.spent, 0);
  const sold = list.reduce((s, p) => s + p.sold, 0);
  const units = list.reduce((s, p) => s + p.units, 0);
  const pending = approvals.filter((a) => a.status === "pending" && list.some((p) => p.id === a.projectId));
  const scopedBookings = bookings.filter((b) => list.some((p) => p.id === b.projectId));
  const collections = scopedBookings.reduce((s, b) => s + b.collected, 0);
  const receivable = scopedBookings.reduce((s, b) => s + (b.value - b.collected), 0);
  const failed = inspections.filter((i) => i.result === "fail" && list.some((p) => p.id === i.projectId));
  const openTally = tally.filter((t) => t.status === "open" || t.status === "review");
  const openDecisions = decisions.filter((d) => d.status === "open").length;
  const emiDue = emis.filter((e) => e.status === "due").reduce((s, e) => s + e.amount, 0);
  const obsOpen = obligations.filter((o) => list.some((p) => p.id === o.projectId) && o.status !== "filed").length;

  const pie = [
    { name: "Spent", value: spent, fill: "var(--color-primary)" },
    { name: "Unspent", value: Math.max(budget - spent, 0), fill: "var(--color-line)" },
  ];

  const bars = list.map((p) => {
    const rows = bookings.filter((b) => b.projectId === p.id);
    return {
      name: p.code,
      collected: rows.reduce((s, b) => s + b.collected, 0),
      remaining: rows.reduce((s, b) => s + (b.value - b.collected), 0),
    };
  });

  return (
    <div>
      <PageHeader
        kicker="Command"
        title="What needs a decision"
        description="Cash, time, quality, and gates on one screen."
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/app/approvals" className="rounded-xl border border-line bg-surface px-4 py-3 hover:bg-chip">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Approvals waiting</p>
          <p className="font-display text-2xl tabular-nums">{pending.length}</p>
        </Link>
        <Link to="/app/changes" className="rounded-xl border border-line bg-surface px-4 py-3 hover:bg-chip">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Failed inspections / NCR</p>
          <p className="font-display text-2xl tabular-nums">{failed.length}</p>
        </Link>
        <Link to="/app/land" className="rounded-xl border border-line bg-surface px-4 py-3 hover:bg-chip">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Statutory open</p>
          <p className="font-display text-2xl tabular-nums">{obsOpen}</p>
        </Link>
        <Link to="/app/finance" className="rounded-xl border border-line bg-surface px-4 py-3 hover:bg-chip">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Tally cases</p>
          <p className="font-display text-2xl tabular-nums">{openTally.length}</p>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Cash committed" value={inr(spent, true)} hint={`of ${inr(budget, true)} budget`} />
        <Kpi label="Receivable" value={inr(receivable, true)} hint={`${inr(collections, true)} collected`} tone="warn" />
        <Kpi
          label="Pending approvals"
          value={String(pending.length)}
          hint={pending.length ? `oldest ${Math.max(...pending.map((a) => a.agingDays))}d` : "Inbox clear"}
          tone={pending.length ? "warn" : "ok"}
        />
        <Kpi
          label="Failed inspections"
          value={String(failed.length)}
          tone={failed.length ? "danger" : "ok"}
          hint={emiDue ? `EMI due ${inr(emiDue, true)}` : "Quality signal"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Programme vs today</CardTitle>
          </CardHeader>
          <CardBody>
            <ProjectTimeline projects={list} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget draw</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-40">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" innerRadius={48} outerRadius={72} stroke="none">
                      {pie.map((s) => (
                        <Cell key={s.name} fill={s.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <p className="text-center text-sm text-muted">
              {inr(spent, true)} drawn · {units ? Math.round((sold / units) * 100) : 0}% units sold
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Collections by project</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-52">{mounted ? <CashBars data={bars} /> : null}</div>
            <p className="mt-2 text-xs text-muted">Jade = collected. Limestone = still receivable.</p>
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Approval aging</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting.</p>
            ) : (
              pending
                .slice()
                .sort((a, b) => b.agingDays - a.agingDays)
                .map((a) => (
                  <Link
                    key={a.id}
                    to="/app/approvals"
                    className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-3 hover:bg-chip"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted">
                        {a.kind} · {a.waitingOn}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm tabular-nums text-warn">{a.agingDays}d</p>
                  </Link>
                ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Risk</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {list.map((p) => {
              const overrun = p.spent / p.budget > p.progress / 100 + 0.08;
              const slip = p.progress < 40 && p.status === "construction";
              const q = inspections.some((i) => i.projectId === p.id && i.result === "fail");
              const score = (overrun ? 1 : 0) + (slip ? 1 : 0) + (q ? 1 : 0);
              return (
                <Link key={p.id} to="/app/projects/$id" params={{ id: p.id }} className="block">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm">{p.name}</p>
                    <span
                      className={
                        score >= 2 ? "text-xs text-danger" : score === 1 ? "text-xs text-warn" : "text-xs text-ok"
                      }
                    >
                      {score >= 2 ? "Elevated" : score === 1 ? "Watch" : "Steady"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < score ? (score >= 2 ? "bg-danger" : "bg-warn") : "bg-chip"
                        }`}
                      />
                    ))}
                  </div>
                </Link>
              );
            })}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open exceptions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <Link to="/app/finance" className="block hover:underline">
              {openTally.length} Tally cases need review
            </Link>
            <Link to="/app/changes" className="block hover:underline">
              {changes.filter((c) => list.some((p) => p.id === c.projectId)).length} change items live
            </Link>
            <Link to="/app/decisions" className="block hover:underline">
              {openDecisions} owner decisions still open
            </Link>
            <Link to="/app/land" className="block hover:underline">
              {obsOpen} statutory obligations open
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {list.map((p) => (
              <Link key={p.id} to="/app/projects/$id" params={{ id: p.id }} className="block">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm">{p.code}</p>
                  <Status value={p.status} />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-chip">
                  <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
