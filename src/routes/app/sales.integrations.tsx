import { createFileRoute, Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONNECTORS, inboundTitle } from "@/lib/sales/integrations";
import { isThirdParty } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/sales/integrations")({ component: Integrations });

function Integrations() {
  const { inbound, user, acceptInbound, rejectInbound } = useAtlas();
  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        kicker="Inbound"
        title="Designed connectors, local inbox"
        description="99acres, MagicBricks, Housing, Meta, Google, WhatsApp, payments and e-sign land here as events. Apply ingest or re-score. Live APIs are owner TODOs. Local only."
      />
      <GateBanner>
        WhatsApp Business is the primary comms channel later. Payment apply records a collection in Atlas — Tally stays the
        books.
      </GateBanner>
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {CONNECTORS.map((c) => (
          <Card key={c.kind} className="p-3">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-xs text-muted">{c.channel}</p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 font-display text-2xl">Queued events</h2>
      <div className="space-y-3">
        {inbound.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{row.kind}</p>
                <p className="font-medium">{inboundTitle(row)}</p>
                <p className="text-sm text-muted">{row.note}</p>
              </div>
              <Status value={row.status} />
            </div>
            {row.status === "queued" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="h-11"
                  onClick={() => toast(acceptInbound(row.id) ?? "Applied. Audit recorded.")}
                >
                  Apply
                </Button>
                <Button size="sm" variant="outline" className="h-11" onClick={() => toast(rejectInbound(row.id) ?? "Rejected.")}>
                  Reject
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
