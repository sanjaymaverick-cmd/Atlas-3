import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Empty } from "@/components/empty";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/approvals")({ component: Approvals });

function Approvals() {
  const { approvals, projects, entityId, projectId, decideApproval, user, vendors, pos, quotes, rfqs } = useAtlas();
  const rows = approvals.filter((a) => {
    const p = projects.find((x) => x.id === a.projectId);
    if (!p || p.entityId !== entityId) return false;
    if (projectId !== "all" && a.projectId !== projectId) return false;
    return true;
  });
  const pending = rows.filter((a) => a.status === "pending");
  const done = rows.filter((a) => a.status !== "pending");
  const canAct = user?.role === "owner" || user?.role === "pm" || user?.role === "accountant";

  return (
    <div>
      <PageHeader
        kicker="Workflow"
        title="Approvals"
        description="Material actions stay human. Step-up would be required in production."
      />
      {pending.length === 0 ? (
        <Empty title="Queue is clear" body="New purchase orders, vendor activations, and exports will land here." />
      ) : (
        <div className="space-y-3">
          {pending.map((a) => {
            const project = projects.find((p) => p.id === a.projectId);
            const po = a.refId ? pos.find((p) => p.id === a.refId) : undefined;
            const vendor = po ? vendors.find((v) => v.id === po.vendorId) : undefined;
            const quote = po?.quoteId ? quotes.find((q) => q.id === po.quoteId) : undefined;
            const rfq = po?.rfqId ? rfqs.find((r) => r.id === po.rfqId) : undefined;
            const context =
              a.context ||
              (vendor ? `${vendor.name} · ${project?.code ?? ""}` : project?.name) ||
              undefined;
            return (
            <Card key={a.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{a.kind}</p>
                <p className="font-display text-xl">{a.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {a.waitingOn} · {a.agingDays} days waiting
                  {a.amount ? ` · ${inr(a.amount, true)}` : ""}
                </p>
                {context ? <p className="mt-1 text-sm text-ink/80">{context}</p> : null}
                {quote && rfq ? (
                  <p className="mt-1 text-xs text-muted">
                    From RFQ {rfq.id.toUpperCase()} · selected quote {inr(quote.amount, true)}
                  </p>
                ) : null}
              </div>
              {canAct ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const err = decideApproval(a.id, "rejected");
                      toast(err ?? "Rejected — recorded on the audit chain.");
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      const err = decideApproval(a.id, "approved");
                      toast(err ?? "Approved — hash-chained in this session.");
                    }}
                  >
                    Approve
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted">View only for this role.</p>
              )}
            </Card>
          );
          })}
        </div>
      )}
      {done.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-2xl">Closed</h2>
          <div className="space-y-2">
            {done.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-line px-4 py-3 text-sm">
                <span className="truncate">{a.title}</span>
                <span className="text-muted">{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
