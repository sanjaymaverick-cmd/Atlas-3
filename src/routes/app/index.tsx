import { createFileRoute } from "@tanstack/react-router";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { ProjectTimeline } from "@/components/project-timeline";
import { QueueStrip } from "@/components/queue-strip";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { canSeeTally } from "@/lib/roles";
import { companyAgentIds, myCompanyId } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: Command });

function Command() {
  const {
    projects,
    entityId,
    projectId,
    approvals,
    bookings,
    tally,
    inspections,
    changes,
    obligations,
    user,
    leads,
    units,
    holds,
    dailyReports,
    agents,
  } = useAtlas();
  const siteDesk = user?.role === "engineer" || user?.role === "supervisor" || user?.role === "stores";
  const channelDesk = user?.role === "channel" || user?.role === "channel_admin";
  const salesDesk = user?.role === "sales";
  const companyId = myCompanyId(user, agents);
  const agentIds = companyAgentIds(agents, companyId);
  const list = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const budget = list.filter((p) => !p.concept).reduce((s, p) => s + p.budget, 0);
  const spent = list.filter((p) => !p.concept).reduce((s, p) => s + p.spent, 0);
  const pending = approvals.filter((a) => a.status === "pending" && list.some((p) => p.id === a.projectId));
  const oldest = pending.length ? Math.max(...pending.map((a) => a.agingDays)) : 0;
  const scopedBookings = bookings.filter((b) => list.some((p) => p.id === b.projectId));
  const collections = scopedBookings.reduce((s, b) => s + b.collected, 0);
  const receivable = scopedBookings.reduce((s, b) => s + (b.value - b.collected), 0);
  const failed = inspections.filter((i) => i.result === "fail" && list.some((p) => p.id === i.projectId));
  const openNcr = changes.filter(
    (c) => c.kind === "ncr" && c.status !== "closed" && list.some((p) => p.id === c.projectId),
  );
  const openTally = tally.filter((t) => (t.status === "open" || t.status === "review") && t.entityId === entityId);
  const obsOpen = obligations.filter((o) => list.some((p) => p.id === o.projectId) && o.status !== "filed").length;
  const overdueObs = obligations.filter(
    (o) => list.some((p) => p.id === o.projectId) && o.status === "overdue",
  ).length;
  const salesScope = channelDesk ? projects : list;
  const pipeline = leads.filter((l) => {
    if (!salesScope.some((p) => p.id === l.projectId) || l.stage === "lost" || l.stage === "won") return false;
    if (companyId) return l.partnerId === companyId || (l.agentId ? agentIds.includes(l.agentId) : false);
    return true;
  });
  const hot = pipeline.filter((l) => l.band === "hot");
  const available = units.filter((u) => salesScope.some((p) => p.id === u.projectId) && u.status === "available");
  const held = holds.filter((h) => h.status === "held" && salesScope.some((p) => p.id === h.projectId) && agentIds.includes(h.agentId));
  const todayRep = dailyReports.filter((d) => d.date === todayIso() && agentIds.includes(d.agentId));
  const spendPct = budget ? Math.round((spent / budget) * 100) : 0;
  const rag: "ok" | "warn" | "danger" = overdueObs || failed.length >= 2 ? "danger" : pending.length || failed.length ? "warn" : "ok";
  const ragLabel = rag === "ok" ? "On track" : rag === "warn" ? "Needs a decision" : "Elevated";

  const queue = channelDesk
    ? [
        { to: "/app/sales/channel", label: "Units on hold", count: held.length },
        { to: "/app/sales/channel", label: "Daily reports today", count: todayRep.length },
        { to: "/app/sales/channel", label: "Available to hold", count: available.length },
        { to: "/app/sales", label: "Hot (your firm)", count: hot.length },
      ]
    : salesDesk
      ? [
          { to: "/app/sales/inventory", label: "Available units", count: available.length },
          { to: "/app/sales/channel", label: "Units on hold", count: held.length },
          { to: "/app/sales/pipeline", label: "Hot leads", count: hot.length },
          { to: "/app/approvals", label: "Approvals waiting", count: pending.length },
        ]
      : siteDesk
        ? [
            { to: "/app/site", label: "Failed inspections", count: failed.length },
            { to: "/app/changes", label: "Open NCRs", count: openNcr.length },
            { to: "/app/land", label: "Statutory open", count: obsOpen },
            { to: "/app/site", label: "Today’s site", count: "Diary" },
          ]
        : [
            { to: "/app/approvals", label: "Approvals waiting", count: pending.length },
            { to: "/app/site", label: "Failed inspections", count: failed.length },
            { to: "/app/changes", label: "Open NCRs", count: openNcr.length },
            ...(canSeeTally(user?.role)
              ? [{ to: "/app/finance", label: "Tally cases", count: openTally.length }]
              : overdueObs
                ? [{ to: "/app/land", label: "Statutory overdue", count: overdueObs }]
                : [{ to: "/app/customers", label: "Receivable", count: inr(receivable, true) }]),
          ];

  const exceptions = [
    failed.length ? `${failed.length} failed inspection${failed.length === 1 ? "" : "s"}` : null,
    overdueObs ? `${overdueObs} statutory overdue` : null,
    pending.length ? `${pending.length} approvals · oldest ${oldest}d` : null,
    openNcr.length ? `${openNcr.length} NCR still open` : null,
    !siteDesk && !channelDesk && receivable > 50_000_000 ? `Collections still open ${inr(receivable, true)}` : null,
  ]
    .filter(Boolean)
    .slice(0, 5) as string[];

  return (
    <div>
      <PageHeader
        kicker="Command"
        title="Are we on track, and what needs a decision?"
        description="Five seconds: status, cash vs plan, open gates. Local only."
      />

      <QueueStrip items={queue} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {channelDesk ? (
          <>
            <Kpi label="Available units" value={String(available.length)} hint="Hold from Channel desk" />
            <Kpi label="Your holds" value={String(held.length)} tone={held.length ? "warn" : "ok"} />
            <Kpi label="Reports today" value={String(todayRep.length)} hint="Mandatory before a hold" tone={todayRep.length ? "ok" : "warn"} />
            <Kpi label="Hot leads" value={String(hot.length)} vs={`${pipeline.length} live`} />
          </>
        ) : salesDesk ? (
          <>
            <Kpi label="Available units" value={String(available.length)} hint="Inventory lock" />
            <Kpi label="Live pipeline" value={String(pipeline.length)} vs={`${hot.length} hot`} tone={hot.length ? "ok" : "warn"} />
            <Kpi label="Units on hold" value={String(held.length)} tone={held.length ? "warn" : "ok"} />
            <Kpi
              label="Collections / cash-in"
              value={inr(collections, true)}
              vs={`still ${inr(receivable, true)}`}
              tone={receivable > collections ? "warn" : "ok"}
            />
          </>
        ) : siteDesk ? (
          <>
            <Kpi label="Portfolio" value={ragLabel} tone={rag} hint="Quality first on this seat" />
            <Kpi label="Failed inspections" value={String(failed.length)} tone={failed.length ? "danger" : "ok"} hint="Site & quality" />
            <Kpi label="Open NCRs" value={String(openNcr.length)} tone={openNcr.length ? "warn" : "ok"} hint="Change control" />
            <Kpi label="Statutory open" value={String(obsOpen)} tone={obsOpen ? "warn" : "ok"} vs="filed vs overdue" />
          </>
        ) : (
          <>
            <Kpi
              label="Collections / cash-in"
              value={inr(collections, true)}
              vs={`still ${inr(receivable, true)}`}
              hint={ragLabel}
              tone={receivable > collections ? "warn" : rag}
            />
            <Kpi
              label="Open gates"
              value={String(pending.length)}
              vs={pending.length ? `oldest ${oldest}d` : "Inbox clear"}
              hint="Approvals waiting"
              tone={pending.length ? "warn" : "ok"}
            />
            <Kpi
              label="Quality"
              value={String(failed.length)}
              hint="Failed inspections"
              tone={failed.length ? "danger" : "ok"}
            />
            <Kpi
              label="Spent vs budget"
              value={`${spendPct}%`}
              vs={`${inr(spent, true)} of ${inr(budget, true)}`}
              hint="Concept land excluded from committed"
              tone={spendPct > 70 ? "warn" : "ok"}
            />
          </>
        )}
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
            <CardTitle>Exceptions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            {exceptions.length === 0 ? (
              <p className="text-muted">Nothing elevated.</p>
            ) : (
              exceptions.map((line) => (
                <p key={line} className="rounded-md border border-line px-3 py-2">
                  {line}
                </p>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
