import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Hint } from "@/components/hint";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import type { ChangeItem } from "@/lib/types";

export const Route = createFileRoute("/app/changes")({ component: Changes });

const KIND_LABEL: Record<ChangeItem["kind"], string> = {
  rfi: "Question to design",
  ncr: "Failed work report",
  change: "Paid extra work",
};

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
        title="Site questions and quality"
        description="Use this desk for three things: a question to the drawing team, work that failed inspection, or extra paid work. Hover any dotted word for a short meaning."
      />
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-3">
        <Field label="What kind of paper">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as ChangeItem["kind"])}
          >
            <option value="rfi">Question to design</option>
            <option value="ncr">Failed work report</option>
            <option value="change">Paid extra work</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            {kind === "rfi" ? (
              <>
                <Hint term="rfi">Question to design</Hint> — site asks the drawing team before they can continue.
              </>
            ) : kind === "ncr" ? (
              <>
                <Hint term="ncr">Failed work report</Hint> — inspection found a problem. Fix it, then check again.
              </>
            ) : (
              <>
                <Hint term="vo">Paid extra work</Hint> — extra cost. A boss must say yes first.
              </>
            )}
          </p>
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
        <Field label="What happened (short title)">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="sm:col-span-3">
          <Button
            onClick={() => {
              if (!title) return toast("Please write a short title.");
              raiseChange({
                projectId: pid,
                kind,
                title,
                status: kind === "rfi" ? "routed" : kind === "ncr" ? "corrective" : "review",
                slaHours: kind === "rfi" ? 48 : undefined,
                severity: kind === "ncr" ? "medium" : undefined,
              });
              toast(
                kind === "change"
                  ? "Paid extra work sent for a yes."
                  : kind === "ncr"
                    ? "Failed work report raised."
                    : "Question sent to design.",
              );
              setTitle("");
            }}
          >
            Send
          </Button>
        </div>
      </Card>
      <div className="space-y-3">
        {rows.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                <Hint term={c.kind}>{KIND_LABEL[c.kind]}</Hint>
              </p>
              <p className="font-medium">{c.title}</p>
              {c.slaHours ? (
                <p className="text-xs text-muted">
                  <Hint term="sla">Time to reply</Hint>: {c.slaHours} hours left (demo clock)
                </p>
              ) : null}
              {c.response ? <p className="text-xs text-muted">{c.response}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Status value={c.severity ?? c.status} />
              {c.kind === "rfi" && c.status !== "closed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    respondChange(c.id, "Design team answered.");
                    toast("Question closed.");
                  }}
                >
                  Record answer
                </Button>
              ) : null}
              {c.kind === "ncr" && c.status !== "closed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    const err = closeNcr(c.id);
                    toast(err ?? "Failed work closed after a new inspection.");
                  }}
                >
                  Close after new inspection
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
