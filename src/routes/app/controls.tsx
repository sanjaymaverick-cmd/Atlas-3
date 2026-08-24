import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { erpnextItemCode, erpnextWarehouse } from "@/lib/erpnext/stock-map";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/controls")({ component: Controls });

function scopedIds(
  projects: { id: string; entityId: string }[],
  entityId: string,
  projectId: string | "all",
) {
  return projects
    .filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId))
    .map((p) => p.id);
}

function Controls() {
  const {
    projects,
    entityId,
    projectId,
    budgetLines,
    materials,
    quantities,
    receiveMaterial,
    issueMaterial,
    approveQuantity,
  } = useAtlas();
  const ids = scopedIds(projects, entityId, projectId);
  const lines = budgetLines.filter((b) => ids.includes(b.projectId));
  const mats = materials.filter((m) => ids.includes(m.projectId));
  const qty = quantities.filter((q) => ids.includes(q.projectId));
  const [issueQty, setIssueQty] = useState<Record<string, string>>({});

  return (
    <div>
      <PageHeader
        kicker="Phase 6"
        title="Project controls"
        description="Cost codes, how much material came in, and how much went to site. You cannot issue more than was received. ERPNext warehouse names are labels only — Atlas never posts Stock Entry."
      />
      <GateBanner>Receipts here are quantities, not GRNs. No challan or vendor on this desk. Not ERPNext stock. Local only.</GateBanner>

      <h2 className="mb-3 font-display text-2xl">Budget vs committed</h2>
      <div className="space-y-3">
        {lines.map((l) => {
          const pct = l.budget ? Math.min(100, Math.round((l.committed / l.budget) * 100)) : 0;
          return (
            <Card key={l.id} className="p-4">
              <div className="flex justify-between gap-3 text-sm">
                <p>
                  <span className="font-mono text-xs text-muted">{l.code}</span> {l.name}
                </p>
                <p className="tabular-nums">
                  {inr(l.committed, true)} / {inr(l.budget, true)}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-chip">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Materials</h2>
      <p className="mb-3 text-sm text-muted">Two buttons: Receive, then Issue. You cannot issue more than was received.</p>
      {mats.length === 0 ? (
        <p className="mb-6 text-sm text-muted">No material lines for this entity / project.</p>
      ) : null}
      <div className="space-y-3">
        {mats.map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs tabular-nums text-muted">
                Issued {m.issued} / received {m.received} {m.unit}
              </p>
              <p className="text-xs text-muted">
                ERPNext {erpnextItemCode(m.name)} @ {erpnextWarehouse(projects.find((p) => p.id === m.projectId)?.entityId ?? entityId)} · not posted
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-11 w-24"
                type="number"
                min={1}
                value={issueQty[m.id] ?? "10"}
                onChange={(e) => setIssueQty((q) => ({ ...q, [m.id]: e.target.value }))}
                aria-label={`Quantity for ${m.name}`}
              />
              <Button size="sm" variant="outline" className="h-11" onClick={() => receiveMaterial(m.id, Number(issueQty[m.id]) || 10)}>
                Receive
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-11"
                onClick={() => {
                  const n = Number(issueQty[m.id]) || 0;
                  const err = issueMaterial(m.id, n);
                  if (err) return toast(err);
                  const now = useAtlas.getState().materials.find((x) => x.id === m.id);
                  toast(`Issued ${n} ${m.unit}. Now ${now?.issued ?? "—"} / ${now?.received ?? "—"} ${m.unit}.`);
                }}
              >
                Issue
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Quantity verification</h2>
      <div className="space-y-3">
        {qty.map((q) => (
          <Card key={q.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{q.wbs}</p>
                <p className="font-medium">{q.name}</p>
                <p className="text-xs tabular-nums text-muted">
                  Drawing qty {q.bimQty} · site measure {q.siteQty}
                </p>
              </div>
              <Status value={q.status === "variance" ? "review" : q.status === "approved" ? "approved" : "pending"} />
            </div>
            {q.status !== "approved" ? (
              <Button
                className="mt-3"
                size="sm"
                onClick={() => {
                  const err = approveQuantity(q.id);
                  toast(err ?? "Quantity locked.");
                }}
              >
                Approve quantity
              </Button>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
