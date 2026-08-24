import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { booksAgent, type BooksResult } from "@/lib/books";
import { canSeeBooks } from "@/lib/roles";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/finance")({ component: Finance });

function Finance() {
  const { tally, entities, entityId, audit, settleTally, user } = useAtlas();
  const rows = tally.filter((t) => t.entityId === entityId);
  const entity = entities.find((e) => e.id === entityId);
  const [books, setBooks] = useState<BooksResult | null>(null);

  useEffect(() => {
    void booksAgent("health").then(setBooks);
  }, []);

  if (!canSeeBooks(user?.role)) {
    return (
      <div>
        <PageHeader title="Company accounts" description="This login cannot touch the books. Local only." />
        <p className="text-sm text-muted">Site seats do not see accounts. Books stay with Finance and the Managing Director.</p>
      </div>
    );
  }

  const booksLine = !books
    ? "Checking ERPNext…"
    : !books.configured
      ? "Books backend not configured. Atlas still runs. See docs/finance/ERPNEXT.md."
      : !books.reachable
        ? `ERPNext unreachable (${books.detail}). Atlas still runs. Posting is off.`
        : `${books.company ?? "MOCK ATLAS3 LLP"} · ERPNext answered · posting ${books.postingEnabled ? "ON" : "off"}`;

  return (
    <div>
      <PageHeader
        kicker="Phase 9"
        title="Company accounts (ERPNext)"
        description="ERPNext at D:\ERPNext is the official book. Atlas never writes a voucher unless posting is explicitly turned on. We only match or flag a mismatch."
      />
      <GateBanner>
        Reconcile or accept an exception here. Books stay in ERPNext. Posting is off by default. Local only — not live.
      </GateBanner>
      <Card className="mb-6 p-5">
        <p className="text-sm text-muted">Legal entity</p>
        <p className="font-display text-2xl">{entity?.name}</p>
        <p className="text-sm tabular-nums text-muted">{entity?.gstin}</p>
        <p className="mt-3 text-sm text-muted">{booksLine}</p>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      settleTally(t.id, "reconciled");
                      toast("Reconciled in Atlas. ERPNext remains the books — no voucher posted.");
                    }}
                  >
                    Reconcile
                  </Button>
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
