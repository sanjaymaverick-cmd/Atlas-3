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
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [issueQty, setIssueQty] = useState<Record<string, string>>({});

  return (
    <div>
      <PageHeader
        kicker="Phase 6"
        title="Materials"
        description="How much came in, how much went to site, and what is still open. You cannot issue more than was received. Site engineers own this desk — a separate stores seat is optional. ERPNext warehouse names are labels only; Atlas never posts Stock Entry."
      />
      <GateBanner>
        Receipts here are quantities, not GRNs. No challan or vendor on this desk. Not ERPNext
        stock. Local only.
      </GateBanner>

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

      <h2 className="mb-3 mt-8 font-display text-2xl">Open stock</h2>
      <p className="mb-3 text-sm text-muted">
        Open stock = received − issued. Receive when the truck comes. Issue when material goes to
        the pour.
      </p>
      {mats.length === 0 ? (
        <p className="mb-6 text-sm text-muted">No material lines for this entity / project.</p>
      ) : null}
      <div className="space-y-3">
        {mats.map((m) => {
          const open = Math.max(0, m.received - m.issued);
          return (
            <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="mt-1 text-base tabular-nums">
                  Open stock{" "}
                  <span className="font-semibold text-primary">
                    {open} {m.unit}
                  </span>
                </p>
                <p className="text-xs tabular-nums text-muted">
                  Received {m.received} · issued {m.issued} {m.unit}
                </p>
                <p className="text-xs text-muted">
                  ERPNext {erpnextItemCode(m.name)} @{" "}
                  {erpnextWarehouse(
                    projects.find((p) => p.id === m.projectId)?.entityId ?? entityId,
                  )}{" "}
                  · not posted
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="h-11 w-20"
                  type="number"
                  min={1}
                  placeholder="In"
                  value={recvQty[m.id] ?? ""}
                  onChange={(e) => setRecvQty((q) => ({ ...q, [m.id]: e.target.value }))}
                  aria-label={`Receive quantity for ${m.name}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    const n = Number(recvQty[m.id]) || 0;
                    if (n <= 0) return toast("Enter how many came in.");
                    receiveMaterial(m.id, n);
                    const now = useAtlas.getState().materials.find((x) => x.id === m.id);
                    const left = Math.max(0, (now?.received ?? 0) - (now?.issued ?? 0));
                    toast(`Received ${n} ${m.unit}. Open stock ${left} ${m.unit}.`);
                    setRecvQty((q) => ({ ...q, [m.id]: "" }));
                  }}
                >
                  Receive
                </Button>
                <Input
                  className="h-11 w-20"
                  type="number"
                  min={1}
                  placeholder="Out"
                  value={issueQty[m.id] ?? ""}
                  onChange={(e) => setIssueQty((q) => ({ ...q, [m.id]: e.target.value }))}
                  aria-label={`Issue quantity for ${m.name}`}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    const n = Number(issueQty[m.id]) || 0;
                    if (n <= 0) return toast("Enter how many to send to site.");
                    const err = issueMaterial(m.id, n);
                    if (err) return toast(err);
                    const now = useAtlas.getState().materials.find((x) => x.id === m.id);
                    const left = Math.max(0, (now?.received ?? 0) - (now?.issued ?? 0));
                    toast(`Issued ${n} ${m.unit}. Open stock ${left} ${m.unit}.`);
                    setIssueQty((q) => ({ ...q, [m.id]: "" }));
                  }}
                >
                  Issue
                </Button>
              </div>
            </Card>
          );
        })}
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
              <Status
                value={
                  q.status === "variance"
                    ? "review"
                    : q.status === "approved"
                      ? "approved"
                      : "pending"
                }
              />
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
