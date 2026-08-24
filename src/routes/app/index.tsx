import { createFileRoute, Link } from "@tanstack/react-router";
import { DecisionCard } from "@/components/decision-card";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { ProjectTimeline } from "@/components/project-timeline";
import { QueueStrip } from "@/components/queue-strip";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupStrip } from "@/components/group-strip";
import { canSeeBooks } from "@/lib/roles";
import { companyAgentIds, myCompanyId, scopedLeads, scopedProjectIds, scopedUnits } from "@/lib/sales-scope";
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
    quantities,
    materials,
    parcels,
    diligence,
    emis,
    documents,
    exports,
    pos,
    rfqs,
  } = useAtlas();
  const role = user?.role;
  const siteDesk = role === "engineer" || role === "supervisor";
  const storesDesk = role === "stores";
  const channelDesk = role === "channel" || role === "channel_admin";
  const salesDesk = role === "sales";
  const legalDesk = role === "legal";
  const docsDesk = role === "docs";
  const commercialDesk = role === "commercial";
  const companyId = myCompanyId(user, agents);
  const agentIds = companyAgentIds(agents, companyId);
  const list = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const budget = list.filter((p) => !p.concept).reduce((s, p) => s + p.budget, 0);
  const spent = list.filter((p) => !p.concept).reduce((s, p) => s + p.spent, 0);
  const pending = approvals.filter((a) => a.status === "pending" && list.some((p) => p.id === a.projectId));
  const oldest = pending.length ? Math.max(...pending.map((a) => a.agingDays)) : 0;
  const oldestRow = pending.slice().sort((a, b) => b.agingDays - a.agingDays)[0];
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
    (o) => list.some((p) => p.id === o.projectId) && (o.status === "overdue" || o.status === "open"),
  );
  const channelProjectIds = scopedProjectIds(user, agents, projects, entityId, projectId);
  const salesScope = channelDesk ? projects.filter((p) => channelProjectIds.includes(p.id)) : list;
  const pipeline = scopedLeads(leads, user, agents, salesScope.map((p) => p.id)).filter(
    (l) => l.stage !== "lost" && l.stage !== "won",
  );
  const hot = pipeline.filter((l) => l.band === "hot");
  const available = scopedUnits(units, salesScope.map((p) => p.id)).filter((u) => u.status === "available");
  const held = holds.filter((h) => h.status === "held" && salesScope.some((p) => p.id === h.projectId) && agentIds.includes(h.agentId));
  const todayRep = dailyReports.filter((d) => d.date === todayIso() && agentIds.includes(d.agentId));
  const unfiled = (companyId ? agents.filter((a) => a.companyId === companyId && a.status === "active") : []).filter(
    (a) => !todayRep.some((d) => d.agentId === a.id),
  );
  const spendPct = budget ? Math.round((spent / budget) * 100) : 0;
  const variance = quantities.filter((q) => q.status === "variance" && list.some((p) => p.id === q.projectId));
  const tightStock = materials.filter(
    (m) => list.some((p) => p.id === m.projectId) && m.received > 0 && m.issued / m.received >= 0.9,
  );
  const openDiligence = diligence.filter((d) => {
    if (d.status === "clear") return false;
    const parcel = parcels.find((x) => x.id === d.parcelId);
    return parcel ? list.some((p) => p.id === parcel.projectId) : false;
  });
  const emiDue = emis.filter((e) => {
    if (e.status !== "due") return false;
    const parcel = parcels.find((x) => x.id === e.parcelId);
    return parcel ? list.some((p) => p.id === parcel.projectId) : false;
  });
  const quarantine = documents.filter((d) => d.status === "quarantine" && list.some((p) => p.id === d.projectId));
  const exportLive = exports.filter((e) => e.status === "pending" || e.status === "granted");
  const poReview = pos.filter((p) => (p.status === "review" || p.status === "submitted") && list.some((x) => x.id === p.projectId));
  const openRfq = rfqs.filter((r) => r.status === "open" && list.some((p) => p.id === r.projectId));
  const zeroCall = agents.filter((a) => !a.inHouse).filter((a) => dailyReports.filter((d) => d.agentId === a.id).reduce((s, d) => s + d.calls, 0) === 0);

  const queue = channelDesk
    ? [
        { to: "/app/sales/channel", label: "Unfiled today", count: unfiled.length },
        { to: "/app/sales/channel", label: "Units on hold", count: held.length },
        { to: "/app/sales/inventory", label: "Available to hold", count: available.length },
        { to: "/app/sales", label: "Hot (your firm)", count: hot.length },
      ]
    : salesDesk
      ? [
          { to: "/app/sales/inventory", label: "Available units", count: available.length },
          { to: "/app/sales/channel", label: "Units on hold", count: held.length },
          { to: "/app/sales/pipeline", label: "Hot leads", count: hot.length },
          { to: "/app/approvals", label: "Approvals waiting", count: pending.length },
        ]
      : storesDesk
        ? [
            { to: "/app/controls", label: "Quantity variance", count: variance.length },
            { to: "/app/controls", label: "Near stock-out", count: tightStock.length },
            { to: "/app/site", label: "Failed inspections", count: failed.length },
            { to: "/app/controls", label: "Material lines", count: materials.filter((m) => list.some((p) => p.id === m.projectId)).length },
          ]
        : siteDesk
          ? [
              { to: "/app/site", label: "Failed inspections", count: failed.length },
              { to: "/app/changes", label: "Failed work still open", count: openNcr.length },
              { to: "/app/site", label: "Today’s diary", count: "Seal" },
            ]
          : legalDesk
            ? [
                { to: "/app/land", label: "Filings still open", count: overdueObs.length },
                { to: "/app/land", label: "Land checks open", count: openDiligence.length },
                { to: "/app/land", label: "Loan instalment due", count: emiDue.length },
              ]
            : docsDesk
              ? [
                  { to: "/app/documents", label: "In quarantine", count: quarantine.length },
                  { to: "/app/documents", label: "Export grants", count: exportLive.length },
                ]
              : commercialDesk
                ? [
                    { to: "/app/commercial", label: "Orders under check", count: poReview.length },
                    { to: "/app/quotations", label: "Price requests open", count: openRfq.length },
                  ]
                : [
                    { to: "/app/approvals", label: "Waiting for a yes", count: pending.length },
                    { to: "/app/site", label: "Failed inspections", count: failed.length },
                    { to: "/app/changes", label: "Failed work still open", count: openNcr.length },
                    ...(canSeeBooks(role)
                      ? [{ to: "/app/finance", label: "Account mismatches", count: openTally.length }]
                      : overdueObs.length
                        ? [{ to: "/app/land", label: "Late government filings", count: overdueObs.filter((o) => o.status === "overdue").length }]
                        : [{ to: "/app/customers", label: "Receivable", count: inr(receivable, true) }]),
                  ];

  const exceptionLinks: Array<{ to: string; label: string }> = [];
  if (!channelDesk && !storesDesk && !legalDesk && !docsDesk && !commercialDesk) {
    if (failed.length) exceptionLinks.push({ to: "/app/site", label: `${failed.length} failed inspection${failed.length === 1 ? "" : "s"}` });
    if (openNcr.length) exceptionLinks.push({ to: "/app/changes", label: `${openNcr.length} failed work still open` });
    if (pending.length) exceptionLinks.push({ to: "/app/approvals", label: `${pending.length} waiting for a yes · oldest ${oldest}d` });
    if (canSeeBooks(role) && openTally.length) exceptionLinks.push({ to: "/app/finance", label: `${openTally.length} account mismatches` });
    if (role !== "engineer" && role !== "supervisor" && overdueObs.some((o) => o.status === "overdue")) {
      exceptionLinks.push({ to: "/app/land", label: `${overdueObs.filter((o) => o.status === "overdue").length} late government filings` });
    }
    if (salesDesk && receivable > 0) exceptionLinks.push({ to: "/app/customers", label: `Collections still open ${inr(receivable, true)}` });
  }
  if (legalDesk && overdueObs.filter((o) => o.status === "overdue").length) {
    exceptionLinks.push({
      to: "/app/land",
      label: `${overdueObs.filter((o) => o.status === "overdue").length} late government filings`,
    });
  }

  const showMoney = !siteDesk && !storesDesk && !channelDesk && !legalDesk && !docsDesk && !commercialDesk;
  const showSalesLine = role === "owner" || role === "pm";

  return (
    <div>
      <PageHeader
        kicker="Command"
        title="Are we on track, and what needs a yes today?"
        description="In five seconds: status, cash vs plan, what a person must do. Local only."
      />

      <QueueStrip items={queue} />

      {role === "owner" ? <GroupStrip /> : null}

      {showMoney ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <Kpi
            label="Collections / cash-in"
            value={inr(collections, true)}
            vs={`still ${inr(receivable, true)}`}
            tone={receivable > collections ? "warn" : "ok"}
            hint={spendPct ? `${spendPct}% spent vs budget (concept excluded)` : undefined}
          />
          {showSalesLine ? (
            <Kpi
              label="Sales heat"
              value={`${hot.length} hot`}
              vs={`${held.length} holds · ${zeroCall.length} agents at 0 calls`}
              hint="Open analytics for the scorecard"
            />
          ) : null}
        </div>
      ) : null}

      {salesDesk ? (
        <div className="mb-6">
          <Kpi
            label="Collections / cash-in"
            value={inr(collections, true)}
            vs={`still ${inr(receivable, true)}`}
            tone={receivable > collections ? "warn" : "ok"}
          />
        </div>
      ) : null}

      {oldestRow && (role === "owner" || role === "pm" || role === "accountant") ? (
        <div className="mb-6">
          <DecisionCard
            kind={oldestRow.kind}
            title={oldestRow.title}
            waitingOn={oldestRow.waitingOn}
            agingDays={oldestRow.agingDays}
            amount={oldestRow.amount ? inr(oldestRow.amount, true) : undefined}
            context="Oldest open gate"
            actions={
              <Button asChild>
                <Link to="/app/approvals">Open queue</Link>
              </Button>
            }
          />
        </div>
      ) : null}

      <div className="mt-2 grid gap-4 lg:grid-cols-5">
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
            {exceptionLinks.length === 0 ? (
              <p className="text-muted">Nothing elevated.</p>
            ) : (
              exceptionLinks.map((line) => (
                <Link
                  key={line.label}
                  to={line.to as "/app"}
                  className="block rounded-md border border-line px-3 py-2 hover:bg-chip"
                >
                  {line.label}
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
