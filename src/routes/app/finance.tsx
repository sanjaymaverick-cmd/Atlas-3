import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/finance")({ component: Finance });

function Finance() {
  const { tally, entities, entityId, audit, settleTally } = useAtlas();
  const rows = tally.filter((t) => t.entityId === entityId);
  const entity = entities.find((e) => e.id === entityId);

  return (
    <div>
      <PageHeader
        kicker="Phase 9"
        title="Tally reconciliation"
        description="Tally is the statutory book of record. Atlas never posts or amends vouchers."
      />
      <Card className="mb-6 p-5">
        <p className="text-sm text-muted">Legal entity</p>
        <p className="font-display text-2xl">{entity?.name}</p>
        <p className="text-sm tabular-nums text-muted">{entity?.gstin}</p>
      </Card>
      <div className="space-y-3">
        {rows.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{t.title}</p>
              <p className="text-sm tabular-nums text-muted">{inr(t.amount)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={t.status} />
              {t.status === "open" || t.status === "review" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => settleTally(t.id, "reconciled")}>Reconcile</Button>
                  <Button size="sm" variant="outline" onClick={() => settleTally(t.id, "exception")}>Accept exception</Button>
                </>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl">Recent audit</h2>
      <div className="space-y-2">
        {audit.slice(0, 8).map((a) => (
          <div key={a.id} className="rounded-md border border-line px-4 py-3 text-sm">
            <p>
              {a.actor} — {a.action}
            </p>
            <p className="text-xs text-muted">{a.entity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
