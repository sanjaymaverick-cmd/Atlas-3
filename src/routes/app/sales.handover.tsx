import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Hint } from "@/components/hint";
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
    setHandoverOcForProject,
    closeSnag,
    toggleBookingDoc,
  } = useAtlas();
  const [filter, setFilter] = useState<"all" | "ready" | "waiting">("all");
  const ids = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id);
  const rows = handovers.filter((h) => ids.includes(h.projectId));
  const liveBooks = bookings.filter((b) => ids.includes(b.projectId) && b.status === "active");

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  const steps = [
    { key: "oc", label: "Permission to live" },
    { key: "snags", label: "Defects" },
    { key: "docs", label: "Papers" },
    { key: "possession", label: "Keys" },
    { key: "society", label: "Society" },
    { key: "dlp", label: "Defect period" },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Give keys"
        description="Permission to live first, then close defects, then buyer papers. Keys come after that. Hover a dotted word if you need the meaning."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All units"],
            ["ready", "Ready for keys"],
            ["waiting", "Booked, not ready"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={filter === id ? "default" : "outline"} onClick={() => setFilter(id)}>
            {label}
          </Button>
        ))}
        {projectId !== "all" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast(setHandoverOcForProject(projectId) ?? "Permission to live recorded for this project.")}
          >
            Record permission to live for this project
          </Button>
        ) : null}
      </div>
      <div className="space-y-3">
        {rows.map((h) => {
          const open = snags.filter((s) => s.unit === h.unit && s.status === "open");
          const book = liveBooks.find((b) => b.unit === h.unit);
          const docs = book ? bookingDocs.filter((d) => d.bookingId === book.id) : [];
          const docsOpen = docs.some((d) => d.status === "open");
          const ready = h.oc === "received" && !open.length && !docsOpen;
          const current =
            h.oc !== "received" ? 0 : open.length ? 1 : docsOpen ? 2 : h.status === "possession" ? 3 : h.status === "society" ? 4 : 5;
          if (filter === "ready" && !ready) return null;
          if (filter === "waiting" && ready) return null;
          return (
            <Card key={h.id} className="p-5">
              <div className="mb-3 flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.12em]">
                {steps.map((s, i) => (
                  <span
                    key={s.key}
                    className={
                      i === current
                        ? "rounded-full bg-primary px-2 py-1 text-primary-fg"
                        : i < current
                          ? "rounded-full bg-ok/15 px-2 py-1 text-ok"
                          : "rounded-full bg-chip px-2 py-1 text-muted"
                    }
                  >
                    <Hint term={s.key} captureClick={false}>
                      {s.label}
                    </Hint>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {h.unit} ·{" "}
                    <Hint term="oc">Permission to live</Hint> {h.oc === "received" ? "received" : "waiting"}
                  </p>
                  <p className="font-display text-2xl">{h.unit}</p>
                  <p className="text-sm text-muted">
                    {current === 0
                      ? "Stopped: waiting for government permission to live in the building"
                      : current === 1
                        ? `${open.length} defects still open`
                        : current === 2
                          ? "Stopped: buyer papers still missing"
                          : ready
                            ? "Ready for keys"
                            : steps[current]?.label}
                    {book && book.status === "active" && !ready ? " · booked, not possession-ready" : ""}
                  </p>
                </div>
                <Status value={h.status} />
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {open.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span>{s.title}</span>
                    <Button size="sm" variant="outline" onClick={() => closeSnag(s.id)}>
                      Close defect
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {h.oc !== "received" ? (
                  <Button className="h-11" variant="outline" onClick={() => toast(setHandoverOc(h.id) ?? "Permission to live recorded.")}>
                    Record permission to live
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
      <h2 className="mb-3 mt-8 font-display text-2xl">Buyer papers (after permission to live and defects)</h2>
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
