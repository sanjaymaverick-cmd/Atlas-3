import { createFileRoute, Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isThirdParty } from "@/lib/sales-scope";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/sales/handover")({ component: Handover });

function Handover() {
  const {
    projects,
    entityId,
    projectId,
    handovers,
    snags,
    bookingDocs,
    bookings,
    user,
    advanceHandover,
    setHandoverOc,
    closeSnag,
    toggleBookingDoc,
  } = useAtlas();
  const ids = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id);
  const rows = handovers.filter((h) => ids.includes(h.projectId));
  const liveBooks = bookings.filter((b) => ids.includes(b.projectId) && b.status === "active");

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  const steps = ["Docs", "OC", "Snags", "Possession", "Society", "DLP"] as const;

  return (
    <div>
      <PageHeader
        kicker="Handover"
        title="OC, snags, possession, society"
        description="Blocking stage first. Possession waits on OC/CC and closed snags. Local only."
      />
      <div className="space-y-3">
        {rows.map((h) => {
          const open = snags.filter((s) => s.unit === h.unit && s.status === "open");
          const book = liveBooks.find((b) => b.unit === h.unit);
          const docs = book ? bookingDocs.filter((d) => d.bookingId === book.id) : [];
          const docsOpen = docs.some((d) => d.status === "open");
          const current = docsOpen ? 0 : h.oc !== "received" ? 1 : open.length ? 2 : h.status === "possession" ? 3 : h.status === "society" ? 4 : 5;
          return (
            <Card key={h.id} className="p-5">
              <div className="mb-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.12em]">
                {steps.map((s, i) => (
                  <span
                    key={s}
                    className={
                      i === current
                        ? "rounded-full bg-primary px-2 py-1 text-primary-fg"
                        : i < current
                          ? "rounded-full bg-ok/15 px-2 py-1 text-ok"
                          : "rounded-full bg-chip px-2 py-1 text-muted"
                    }
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {h.unit} · OC {h.oc}
                  </p>
                  <p className="font-display text-2xl">{h.unit}</p>
                  <p className="text-sm text-muted">
                    {current === 0
                      ? "Blocking: booking documents"
                      : current === 1
                        ? "Blocking: OC/CC"
                        : current === 2
                          ? `${open.length} open snags`
                          : h.status}
                  </p>
                </div>
                <Status value={h.status} />
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {open.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span>{s.title}</span>
                    <Button size="sm" variant="outline" onClick={() => closeSnag(s.id)}>
                      Close snag
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {h.oc !== "received" ? (
                  <Button className="h-11" variant="outline" onClick={() => toast(setHandoverOc(h.id) ?? "OC/CC recorded.")}>
                    Record OC/CC
                  </Button>
                ) : null}
                <Button
                  className="h-11"
                  variant="outline"
                  onClick={() => {
                    const err = advanceHandover(h.id);
                    toast(err ?? "Handover advanced.");
                  }}
                >
                  Advance stage
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <h2 className="mb-3 mt-8 font-display text-2xl">Stage 0 · Booking documents</h2>
      <div className="space-y-3">
        {liveBooks.map((b) => {
          const docs = bookingDocs.filter((d) => d.bookingId === b.id);
          if (!docs.length) return null;
          return (
            <Card key={b.id} className="p-5">
              <p className="font-medium">
                {b.unit} · {b.customer}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>{d.title}</span>
                    <div className="flex items-center gap-2">
                      <Status value={d.status} />
                      <Button size="sm" variant="outline" onClick={() => toggleBookingDoc(d.id)}>
                        {d.status === "open" ? "Mark received" : "Reopen"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
