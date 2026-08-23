import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Empty } from "@/components/empty";
import { DecisionCard } from "@/components/decision-card";
import { Button } from "@/components/ui/button";
import { canActOnApproval } from "@/lib/roles";
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
  const role = user?.role;

  return (
    <div>
      <PageHeader
        kicker="Workflow"
        title="Approvals"
        description="Material actions stay human. Step-up would be required in production."
      />
      {pending.length === 0 ? (
        <Empty
          title="Queue is clear"
          body="New purchase orders, vendor activations, and exports will land here."
          action={
            <Button asChild variant="outline">
              <Link to="/app/quotations">Raise from Quotations</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {pending.map((a) => {
            const project = projects.find((p) => p.id === a.projectId);
            const po = a.refId ? pos.find((p) => p.id === a.refId) : undefined;
            const vendor = po ? vendors.find((v) => v.id === po.vendorId) : undefined;
            const quote = po?.quoteId ? quotes.find((q) => q.id === po.quoteId) : undefined;
            const rfq = po?.rfqId ? rfqs.find((r) => r.id === po.rfqId) : undefined;
            const others = rfq ? Math.max(0, quotes.filter((q) => q.rfqId === rfq.id).length - 1) : 0;
            const quoteLine =
              vendor && quote
                ? `Selected quote · ${vendor.name} · ${inr(quote.amount, true)} · vs ${others} other quote${others === 1 ? "" : "s"}`
                : a.context ||
                  (vendor ? `${vendor.name} · ${project?.code ?? ""}` : project?.name) ||
                  undefined;
            return (
            <DecisionCard
              key={a.id}
              kind={a.kind}
              title={a.title}
              waitingOn={a.waitingOn}
              agingDays={a.agingDays}
              amount={a.amount ? inr(a.amount, true) : undefined}
              context={
                <>
                  {quoteLine}
                  {rfq ? (
                    <>
                      {" "}
                      <Link to="/app/quotations" className="text-primary underline-offset-4 hover:underline">
                        Compare quotes
                      </Link>
                    </>
                  ) : null}
                </>
              }
              actions={
                canActOnApproval(role, a.waitingOn, a.kind) ? (
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
                        toast(err ?? "Approved — recorded on the audit chain.");
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">Waiting on {a.waitingOn}.</p>
                )
              }
            />
          );
          })}
        </div>
      )}
      {done.length > 0 ? (
        <details className="mt-8">
          <summary className="cursor-pointer font-display text-2xl">Closed ({done.length})</summary>
          <div className="mt-3 space-y-2">
            {done.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-line px-4 py-3 text-sm">
                <span className="truncate">{a.title}</span>
                <span className="text-muted">{a.status}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
