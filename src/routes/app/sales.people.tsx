import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isThirdParty } from "@/lib/sales-scope";
import { STAGE_LABEL } from "@/lib/sales/stages";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/sales/people")({ component: People });

function People() {
  const { leads, bookings, payments, snags, units, leadActivities, scoreHistory, user, toggleWaConsent } = useAtlas();
  const [open, setOpen] = useState<string | null>(null);

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  return (
    <div>
      <PageHeader
        kicker="Customer 360°"
        title="One person, every desk"
        description="Lead, score, WhatsApp consent, booking, collections, snags. Local only."
      />
      <div className="space-y-3">
        {leads.map((l) => {
          const book = bookings.find((b) => b.customer === l.name || (b.unit && b.unit === l.unit));
          const inv = units.find((u) => u.code === l.unit);
          const shown = open === l.id;
          return (
            <Card key={l.id} className="p-4">
              <button type="button" className="flex w-full flex-wrap items-start justify-between gap-3 text-left" onClick={() => setOpen(shown ? null : l.id)}>
                <div>
                  <p className="font-display text-xl">{l.name}</p>
                  <p className="text-sm text-muted">
                    {l.phone} · {l.source} · {STAGE_LABEL[l.stage]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Status value={l.band ?? "warm"} />
                  {book ? <Status value={book.status} /> : null}
                </div>
              </button>
              {shown ? (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Interest</p>
                    <p className="text-sm">
                      {l.unit || "—"} {inv ? `· ${inv.status} · ${inr(inv.price, true)}` : ""}
                    </p>
                    {l.budget ? <p className="text-sm text-muted">Budget {inr(l.budget, true)}</p> : null}
                    <p className="mt-2 text-sm">{l.note}</p>
                    <Button className="mt-3 h-11" variant="outline" onClick={() => toast(toggleWaConsent(l.id) ?? "Consent updated.")}>
                      WhatsApp consent: {l.waConsent ? "on" : "off"}
                    </Button>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Score</p>
                    <p className="text-sm">
                      {l.score ?? "—"} · {(l.scoreReasons ?? []).join(" · ")}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {scoreHistory
                        .filter((s) => s.leadId === l.id)
                        .slice(0, 3)
                        .map((s) => (
                          <li key={s.id}>
                            {s.at.slice(0, 10)} · {s.score} {s.band}
                          </li>
                        ))}
                      {leadActivities.filter((a) => a.leadId === l.id).length} events
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Money & snags</p>
                    {book ? (
                      <p className="text-sm">
                        {book.unit} · collected {inr(book.collected, true)} of {inr(book.value, true)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted">No booking yet.</p>
                    )}
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {book
                        ? payments
                            .filter((p) => p.bookingId === book.id)
                            .map((p) => (
                              <li key={p.id}>
                                {p.label} · {inr(p.paid, true)} / {inr(p.amount, true)}
                              </li>
                            ))
                        : null}
                      {snags
                        .filter((s) => s.unit === l.unit)
                        .map((s) => (
                          <li key={s.id}>
                            Snag · {s.title} · {s.status}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
