import { createFileRoute, Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { Kpi } from "@/components/kpi";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { driftNote, modelMix, nativeScoreCount, recentScoreMean, SCORE_BASELINE_MEAN } from "@/lib/sales/observe";
import { isThirdParty } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";
import { STAGE_LABEL } from "@/lib/sales/stages";
import type { LeadStage } from "@/lib/types";

export const Route = createFileRoute("/app/sales/analytics")({ component: SalesAnalytics });

const STAGES: LeadStage[] = ["inquiry", "contacted", "qualified", "visit", "negotiation", "won", "lost", "nurture"];

function SalesAnalytics() {
  const {
    projects,
    entityId,
    projectId,
    leads,
    agents,
    dailyReports,
    commissions,
    user,
    partners,
    scoreHistory,
    scoreModels,
    activeScoreModel,
    approvals,
    requestCommission,
  } = useAtlas();
  const ids = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id);
  const rows = leads.filter((l) => ids.includes(l.projectId));
  const live = rows.filter((l) => l.stage !== "lost" && l.stage !== "won");
  const partnerLeads = rows.filter((l) => l.partnerId);
  const inHouse = rows.filter((l) => !l.partnerId);
  const won = rows.filter((l) => l.stage === "won");
  const byBand = {
    hot: live.filter((l) => l.band === "hot").length,
    warm: live.filter((l) => l.band === "warm").length,
    cold: live.filter((l) => l.band === "cold").length,
  };
  const sources = Array.from(new Set(rows.map((l) => l.source)));
  const maxStage = Math.max(...STAGES.map((s) => rows.filter((l) => l.stage === s).length), 1);
  const accrued = commissions.filter((c) => ids.includes(c.projectId) && c.status === "accrued");
  const channelAgents = agents.filter((a) => !a.inHouse);
  const inHouseAgents = agents.filter((a) => a.inHouse);

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        kicker="Sales analytics"
        title="Third-party and in-house on one funnel"
        description="Conversion by source and score band. Cost-per-lead waits on portal spend. Local only."
      />
      <GateBanner>
        {driftNote(scoreHistory)} Live portal spend is still an owner TODO, so cost-per-lead is blank.
      </GateBanner>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Live pipeline" value={String(live.length)} hint={`${won.length} won`} />
        <Kpi label="Channel leads" value={String(partnerLeads.length)} vs={`${inHouse.length} in-house`} />
        <Kpi
          label="Hot band"
          value={String(byBand.hot)}
          vs={`${byBand.warm} warm · ${byBand.cold} cold`}
          tone={byBand.hot ? "ok" : "warn"}
        />
        <Kpi
          label="Commission accrued"
          value={inr(accrued.reduce((s, c) => s + c.amount, 0), true)}
          hint="Never self-pays"
          tone="warn"
        />
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Funnel</h2>
      <Card className="space-y-3 p-5">
        {STAGES.map((s) => {
          const n = rows.filter((l) => l.stage === s).length;
          return (
            <div key={s} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="text-muted">{STAGE_LABEL[s]}</span>
              <div className="h-3 overflow-hidden rounded-full bg-chip">
                <div className="h-full bg-primary" style={{ width: `${Math.max(6, (n / maxStage) * 100)}%` }} />
              </div>
              <span className="tabular-nums">{n}</span>
            </div>
          );
        })}
      </Card>

      <h2 className="mb-3 mt-8 font-display text-2xl">By source</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {sources.map((src) => {
          const set = rows.filter((l) => l.source === src);
          const w = set.filter((l) => l.stage === "won").length;
          return (
            <Card key={src} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{src}</p>
                <p className="text-xs text-muted">
                  {set.length} leads · {w} won
                </p>
              </div>
              <p className="tabular-nums text-sm text-muted">
                {w === 0 ? `${set.length} live · none booked yet` : `${Math.round((w / set.length) * 100)}% booked`}
              </p>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Channel scorecard</h2>
      <div className="space-y-2">
        {channelAgents.map((a) => {
          const reps = dailyReports.filter((d) => d.agentId === a.id);
          const calls = reps.reduce((s, d) => s + d.calls, 0);
          const firm = partners.find((p) => p.id === a.companyId)?.name;
          return (
            <Card key={a.id} className="flex justify-between p-4 text-sm">
              <span>
                {a.name} · {firm}
              </span>
              <span className="tabular-nums text-muted">
                {reps.length} reports · {calls} calls
              </span>
            </Card>
          );
        })}
        {inHouseAgents.map((a) => (
          <Card key={a.id} className="flex justify-between p-4 text-sm">
            <span>{a.name} · in-house</span>
            <span className="text-muted">Direct desk</span>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Commission payouts</h2>
      <p className="mb-3 text-sm text-muted">Accrued only. Atlas never pays and never posts ERPNext. Send to Approvals.</p>
      <div className="space-y-2">
        {commissions
          .filter((c) => ids.includes(c.projectId))
          .map((c) => {
            const waiting = approvals.some((a) => a.kind === "Commission" && a.refId === c.id && a.status === "pending");
            return (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{partners.find((p) => p.id === c.partnerId)?.name ?? c.partnerId}</p>
                  <p className="text-sm tabular-nums text-muted">
                    {inr(c.amount, true)} · booking {c.bookingId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Status value={c.status} />
                  {c.status === "accrued" && !waiting ? (
                    <Button
                      size="sm"
                      className="h-11"
                      onClick={() => {
                        const err = requestCommission(c.id);
                        toast(err ?? "Waiting in Approvals. Atlas will not pay from here.");
                      }}
                    >
                      Send for approval
                    </Button>
                  ) : c.status === "accrued" ? (
                    <span className="text-xs text-muted">Waiting in Approvals</span>
                  ) : null}
                </div>
              </Card>
            );
          })}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Model monitor</h2>
      <GateBanner>{driftNote(scoreHistory)}</GateBanner>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Recent mean" value={String(recentScoreMean(scoreHistory))} hint={`baseline ${SCORE_BASELINE_MEAN}`} />
        <Kpi label="Active model" value={scoreModels.find((m) => m.kind === activeScoreModel)?.name ?? activeScoreModel} />
        <Kpi label="Native CatBoost rows" value={String(nativeScoreCount(scoreHistory))} hint="Bind scoring URL to fill" />
        <Kpi label="History" value={String(scoreHistory.length)} hint="last 200 kept" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {Object.entries(modelMix(scoreHistory)).map(([model, n]) => (
          <Card key={model} className="flex items-center justify-between p-4">
            <p className="font-medium">{model}</p>
            <p className="tabular-nums text-sm text-muted">{n}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-3 p-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-muted">Latest scores</p>
        <ul className="space-y-2 text-sm">
          {scoreHistory.slice(0, 8).map((h) => (
            <li key={h.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {h.at.slice(0, 16).replace("T", " ")} · {h.triggerType}
              </span>
              <span className="tabular-nums text-muted">
                {h.score} {h.band} · {h.model}
              </span>
            </li>
          ))}
          {!scoreHistory.length ? <li className="text-muted">No scores yet.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
