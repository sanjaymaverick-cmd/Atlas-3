import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import type { ChangeItem } from "@/lib/types";

export const Route = createFileRoute("/app/changes")({ component: Changes });

function Changes() {
  const { changes, projects, entityId, projectId, raiseChange, respondChange, closeNcr } = useAtlas();
  const scoped = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = scoped.map((p) => p.id);
  const rows = changes.filter((c) => ids.includes(c.projectId));
  const [kind, setKind] = useState<ChangeItem["kind"]>("rfi");
  const [title, setTitle] = useState("");
  const [pid, setPid] = useState(ids[0] ?? "");

  return (
    <div>
      <PageHeader
        kicker="Phase 7"
        title="Change control"
        description="RFIs, NCRs, and variation orders are first-class — not a generic discrepancy pile."
      />
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-3">
        <Field label="Type">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as ChangeItem["kind"])}
          >
            <option value="rfi">RFI</option>
            <option value="ncr">NCR</option>
            <option value="change">Change / VO</option>
          </select>
        </Field>
        <Field label="Project">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
          >
            {scoped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="sm:col-span-3">
          <Button
            onClick={() => {
              if (!title) return toast("Title required.");
              raiseChange({
                projectId: pid,
                kind,
                title,
                status: kind === "rfi" ? "routed" : kind === "ncr" ? "corrective" : "review",
                slaHours: kind === "rfi" ? 48 : undefined,
                severity: kind === "ncr" ? "medium" : undefined,
              });
              toast(kind === "change" ? "VO submitted to Approvals." : "Raised.");
              setTitle("");
            }}
          >
            Raise
          </Button>
        </div>
      </Card>
      <div className="space-y-3">
        {rows.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{c.kind}</p>
              <p className="font-medium">{c.title}</p>
              {c.slaHours ? <p className="text-xs text-muted">SLA {c.slaHours}h remaining (demo clock)</p> : null}
              {c.response ? <p className="text-xs text-muted">{c.response}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Status value={c.severity ?? c.status} />
              {c.kind === "rfi" && c.status !== "closed" ? (
                <Button size="sm" variant="outline" onClick={() => { respondChange(c.id, "Design response recorded."); toast("RFI closed."); }}>Respond</Button>
              ) : null}
              {c.kind === "ncr" && c.status !== "closed" ? (
                <Button size="sm" variant="outline" onClick={() => { const err = closeNcr(c.id); toast(err ?? "NCR closed."); }}>Close after re-inspection</Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
