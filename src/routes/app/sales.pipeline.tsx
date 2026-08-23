import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { isThirdParty } from "@/lib/sales-scope";
import { STAGE_LABEL } from "@/lib/sales/stages";
import { useAtlas } from "@/lib/store";
import { inr, todayIso } from "@/lib/utils";
import type { Lead, SalesAgent, ScoreModelKind } from "@/lib/types";

export const Route = createFileRoute("/app/sales/pipeline")({ component: Pipeline });

function assignableAgents(agents: SalesAgent[], lead: Lead) {
  return agents.filter(
    (a) => a.status === "active" && (a.inHouse || (lead.partnerId ? a.companyId === lead.partnerId : false)),
  );
}

function Pipeline() {
  const {
    projects,
    entityId,
    projectId,
    leads,
    units,
    user,
    agents,
    scoreModels,
    activeScoreModel,
    leadActivities,
    scoreHistory,
    siteVisits,
    ingestLead,
    assignLead,
    advanceLead,
    loseLead,
    nurtureLead,
    toggleWaConsent,
    convertLead,
    rescoreLead,
    setScoreModel,
    scheduleVisit,
    completeVisit,
  } = useAtlas();
  const ids = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id);
  const rows = leads.filter((l) => ids.includes(l.projectId));
  const free = units.filter((u) => ids.includes(u.projectId) && u.status === "available");
  const [pid, setPid] = useState(ids[0] ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("99acres");
  const [unit, setUnit] = useState(free[0]?.code ?? "");
  const [budget, setBudget] = useState("7500000");
  const [convertValue, setConvertValue] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [visitDate, setVisitDate] = useState(todayIso());

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        kicker="In-house pipeline"
        title="New → visit → book"
        description="New, contacted, qualified, site visit, negotiation, booked / lost / nurture. Assign an active agent. Convert locks inventory and opens handover. Local only."
      />
      <GateBanner>
        CatBoost is a separate service (`services/scoring`) that takes categoricals via cat_features. This host does not
        re-implement Ordered Target Statistics. Select CatBoost to queue a native apply; unbound → hybrid. Dedup is
        phone + project.
      </GateBanner>

      <Card className="mb-6 p-5">
        <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-muted">Scoring model</p>
        <div className="flex flex-wrap gap-2">
          {scoreModels.map((m) => (
            <Button
              key={m.id}
              size="sm"
              variant={m.kind === activeScoreModel ? "default" : "outline"}
              className="h-11"
              onClick={() => setScoreModel(m.kind as ScoreModelKind)}
            >
              {m.name}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{scoreModels.find((m) => m.kind === activeScoreModel)?.note}</p>
      </Card>

      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={pid} onChange={(e) => setPid(e.target.value)}>
            {projects
              .filter((p) => ids.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Source">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
            {["walk-in", "website", "partner", "99acres", "magicbricks", "housing", "meta", "google"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Unit interest">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {free.map((u) => (
              <option key={u.id} value={u.code}>
                {u.code} · {u.kind}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget (INR)">
          <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button
            className="h-12"
            onClick={() => {
              if (!name || !phone) return toast("Name and phone required.");
              const err = ingestLead({
                projectId: pid,
                name,
                phone,
                source,
                unit,
                note: "Ingested on Sales command",
                budget: Number(budget) || undefined,
                kind: free.find((u) => u.code === unit)?.kind,
              });
              toast(err ?? "Lead scored and parked as New.");
              setName("");
              setPhone("");
            }}
          >
            Ingest & score
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((l) => {
          const inv = units.find((u) => u.projectId === l.projectId && u.code === l.unit);
          const acts = leadActivities.filter((a) => a.leadId === l.id);
          const hist = scoreHistory.filter((s) => s.leadId === l.id).slice(0, 3);
          const visits = siteVisits.filter((v) => v.leadId === l.id);
          const open = openId === l.id;
          const owner = agents.find((a) => a.id === l.agentId);
          const desk = assignableAgents(agents, l);
          return (
            <Card key={l.id} className="p-4" data-lead-id={l.id}>
              <button type="button" className="flex w-full flex-wrap items-start justify-between gap-3 text-left" onClick={() => setOpenId(open ? null : l.id)}>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {l.source} · {l.unit || "no unit"} · {l.scoreModel} · {owner?.name ?? "unassigned"}
                  </p>
                  <p className="font-display text-xl">{l.name}</p>
                  <p className="text-sm text-muted">
                    Score {l.currentScore ?? l.score ?? "—"} · p {((l.currentProbability ?? (l.score ?? 0) / 100)).toFixed(2)} · {(l.currentScoreReasons ?? l.scoreReasons ?? []).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Status value={l.band ?? "warm"} />
                  <Status value={STAGE_LABEL[l.stage]} />
                </div>
              </button>
              {l.stage !== "won" && l.stage !== "lost" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <select
                    aria-label={`Assign ${l.name}`}
                    className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
                    value={l.agentId ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const err = assignLead(l.id, e.target.value);
                      toast(err ?? `Assigned to ${agents.find((a) => a.id === e.target.value)?.name}.`);
                    }}
                  >
                    <option value="">Assign agent</option>
                    {desk.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.inHouse ? " · in-house" : ""}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => toast(advanceLead(l.id) ?? "Advanced.")}>
                    Advance
                  </Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => toast(rescoreLead(l.id, "whatsapp") ?? "Re-scored.")}>
                    WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => toast(rescoreLead(l.id, "call") ?? "Re-scored.")}>
                    Call
                  </Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => toast(rescoreLead(l.id, "brochure") ?? "Re-scored.")}>
                    Brochure
                  </Button>
                  <Input
                    className="h-11 w-36"
                    type="number"
                    value={convertValue[l.id] ?? String(l.budget ?? 7500000)}
                    onChange={(e) => setConvertValue((v) => ({ ...v, [l.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    className="h-11"
                    variant="outline"
                    onClick={() => {
                      const err = convertLead(l.id, Number(convertValue[l.id] ?? l.budget) || 0);
                      toast(err ?? "Unit locked as booked. Handover opened. Commission accrued if partner active.");
                    }}
                  >
                    Book unit
                  </Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => loseLead(l.id)}>
                    Lost
                  </Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => nurtureLead(l.id)}>
                    Nurture
                  </Button>
                  <Button size="sm" variant="outline" className="h-11" onClick={() => toast(toggleWaConsent(l.id) ?? "Consent updated.")}>
                    WA consent {l.waConsent ? "on" : "off"}
                  </Button>
                </div>
              ) : null}
              {open ? (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Customer 360°</p>
                    <p className="mt-1 text-sm">{l.phone}</p>
                    <p className="text-sm text-muted">{l.note}</p>
                    <p className="mt-2 text-sm">
                      Unit {l.unit || "—"} {inv ? `· ${inv.status} · ${inr(inv.price, true)}` : ""}
                    </p>
                    {l.budget ? <p className="text-sm text-muted">Budget {inr(l.budget, true)}</p> : null}
                    <p className="mt-2 text-sm text-muted">Desk {owner?.name ?? "unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Why this score</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {(l.scoreReasons ?? []).map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {hist.map((h) => (
                        <li key={h.id}>
                          {h.at.slice(0, 10)} · {h.score} {h.band} · {h.model}
                        </li>
                      ))}
                    </ul>
                    {acts.length ? (
                      <p className="mt-2 text-xs text-muted">{acts.length} engagement events</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Site visit</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input type="date" className="h-11 w-40" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11"
                        onClick={() => toast(scheduleVisit({ leadId: l.id, scheduled: visitDate, note: "Sample flat" }) ?? "Visit booked.")}
                      >
                        Schedule
                      </Button>
                    </div>
                    <ul className="mt-2 space-y-2 text-sm">
                      {visits.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2">
                          <span>
                            {v.scheduled} · {v.unit || "unit tbd"}
                          </span>
                          {v.status === "scheduled" ? (
                            <Button size="sm" variant="outline" onClick={() => toast(completeVisit(v.id, "done") ?? "Visit done.")}>
                              Mark done
                            </Button>
                          ) : (
                            <Status value={v.status} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
