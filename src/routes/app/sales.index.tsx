import { createFileRoute, Link } from "@tanstack/react-router";
import { GateBanner } from "@/components/gate-banner";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { QueueStrip } from "@/components/queue-strip";
import { Status } from "@/components/status";
import { Card } from "@/components/ui/card";
import { companyAgentIds, isThirdParty, myCompanyId } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/sales/")({ component: SalesCommand });

function SalesCommand() {
  const {
    projects,
    entityId,
    projectId,
    units,
    leads,
    holds,
    dailyReports,
    commissions,
    agents,
    user,
    partners,
    notices,
  } = useAtlas();
  const channel = isThirdParty(user?.role);
  const companyId = myCompanyId(user, agents);
  const ids = companyId
    ? projects.map((p) => p.id)
    : projects
        .filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId))
        .map((p) => p.id);
  const agentIds = companyAgentIds(agents, companyId);
  const inv = units.filter((u) => ids.includes(u.projectId));
  const liveLeads = leads.filter((l) => {
    if (!ids.includes(l.projectId) || l.stage === "lost" || l.stage === "won") return false;
    if (companyId)
      return l.partnerId === companyId || (l.agentId ? agentIds.includes(l.agentId) : false);
    return true;
  });
  const hot = liveLeads.filter((l) => l.band === "hot");
  const held = holds.filter(
    (h) => h.status === "held" && ids.includes(h.projectId) && agentIds.includes(h.agentId),
  );
  const available = inv.filter((u) => u.status === "available");
  const todayRep = dailyReports.filter(
    (d) => d.date === new Date().toISOString().slice(0, 10) && agentIds.includes(d.agentId),
  );
  const accrued = commissions.filter(
    (c) =>
      ids.includes(c.projectId) &&
      c.status === "accrued" &&
      (!companyId || c.partnerId === companyId),
  );
  const firm = companyId ? partners.find((p) => p.id === companyId)?.name : undefined;

  return (
    <div>
      <PageHeader
        kicker="Sales command"
        title={channel ? (firm ?? "Channel desk") : "Third-party now, in-house next"}
        description="A unit can be free, on hold, or booked — never two at once. Commission is counted, never paid by itself. Atlas never writes to company accounts."
      />
      <GateBanner>
        Portal connectors (99acres, MagicBricks, Housing, ads) and a trained GBDT lab are owner
        TODOs. This host scores with rules + a swappable GBDT-lite (XGBoost / LightGBM / CatBoost
        encodings).
      </GateBanner>
      <QueueStrip
        items={
          channel
            ? [
                { to: "/app/sales/channel", label: "Units on hold", count: held.length },
                { to: "/app/sales/channel", label: "Daily reports today", count: todayRep.length },
                {
                  to:
                    user?.role === "channel_admin" ? "/app/sales/company" : "/app/sales/inventory",
                  label: user?.role === "channel_admin" ? "Agents" : "Available to hold",
                  count:
                    user?.role === "channel_admin"
                      ? agents.filter((a) => a.companyId === companyId).length
                      : available.length,
                },
                { to: "/app/sales/channel", label: "Hot (your firm)", count: hot.length },
              ]
            : [
                { to: "/app/sales/inventory", label: "Available units", count: available.length },
                { to: "/app/sales/channel", label: "Units on hold", count: held.length },
                { to: "/app/sales/pipeline", label: "Hot leads", count: hot.length },
                { to: "/app/sales/analytics", label: "Live pipeline", count: liveLeads.length },
              ]
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Inventory lock"
          value={String(inv.length)}
          hint={`${held.length} held · ${available.length} free`}
        />
        <Kpi
          label="Live leads"
          value={String(liveLeads.length)}
          vs={`${hot.length} hot`}
          tone={hot.length ? "ok" : "warn"}
        />
        <Kpi
          label="Daily reports today"
          value={String(todayRep.length)}
          hint="Mandatory before a hold"
        />
        <Kpi
          label="Commission accrued"
          value={inr(
            accrued.reduce((s, c) => s + c.amount, 0),
            true,
          )}
          hint="Never self-pays"
          tone="warn"
        />
      </div>
      {channel ? null : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link to="/app/sales/inventory" className="block">
            <Card className="p-5 hover:bg-chip">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Inventory</p>
              <p className="font-display text-2xl">Units</p>
              <p className="mt-1 text-sm text-muted">Flats, shops, plots. Status machine.</p>
            </Card>
          </Link>
          <Link to="/app/sales/channel" className="block">
            <Card className="p-5 hover:bg-chip">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Third party</p>
              <p className="font-display text-2xl">Channel</p>
              <p className="mt-1 text-sm text-muted">Daily report, hold, book.</p>
            </Card>
          </Link>
          <Link to="/app/sales/pipeline" className="block">
            <Card className="p-5 hover:bg-chip">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">In-house</p>
              <p className="font-display text-2xl">Pipeline</p>
              <p className="mt-1 text-sm text-muted">Score, visit, convert.</p>
            </Card>
          </Link>
          <Link to="/app/sales/analytics" className="block">
            <Card className="p-5 hover:bg-chip">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Both desks</p>
              <p className="font-display text-2xl">Analytics</p>
              <p className="mt-1 text-sm text-muted">Funnel, source, score band.</p>
            </Card>
          </Link>
        </div>
      )}
      {notices.length ? (
        <>
          <h2 className="mb-3 mt-8 font-display text-2xl">Events</h2>
          <ul className="mb-6 space-y-2 text-sm">
            {notices.slice(0, 4).map((n) => (
              <li key={n.id}>
                <Link
                  to={n.to as "/app/sales"}
                  className="block rounded-md border border-line px-4 py-3 hover:bg-chip"
                >
                  {n.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2 className="mb-3 mt-8 font-display text-2xl">
        {channel ? "Your hot / warm" : "Hot / warm"}
      </h2>
      <div className="space-y-2">
        {liveLeads
          .slice()
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
          .slice(0, 6)
          .map((l) => (
            <Card key={l.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-muted">
                  {l.source} · {l.unit || "no unit"} · {l.scoreReasons?.[0]}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm tabular-nums text-muted">{l.score ?? "—"}</span>
                <Status value={l.band ?? "warm"} />
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}
