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
import type { Customer, Lead } from "@/lib/types";

export const Route = createFileRoute("/app/sales/people")({ component: People });

function samePerson(c: Customer, l: Lead) {
  if (l.customerId && l.customerId === c.id) return true;
  if (c.phone && l.phone && c.phone === l.phone) return true;
  return c.name === l.name;
}

function People() {
  const {
    projects,
    entityId,
    projectId,
    customers,
    leads,
    bookings,
    payments,
    snags,
    units,
    agents,
    leadActivities,
    scoreHistory,
    waSends,
    user,
    toggleWaConsent,
  } = useAtlas();
  const [open, setOpen] = useState<string | null>(null);

  if (isThirdParty(user?.role)) return <Navigate to="/app/sales/channel" />;

  const ids = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)).map((p) => p.id);
  const scopedLeads = leads.filter((l) => ids.includes(l.projectId));
  const scopedBooks = bookings.filter((b) => ids.includes(b.projectId));
  const master: Customer[] = customers.filter(
    (c) =>
      scopedLeads.some((l) => samePerson(c, l)) ||
      scopedBooks.some((b) => b.customerId === c.id || b.customer === c.name),
  );
  for (const l of scopedLeads) {
    if (master.some((c) => samePerson(c, l))) continue;
    master.push({
      id: l.customerId ?? l.id,
      name: l.name,
      phone: l.phone,
      source: l.source,
      createdAt: l.lastScoredAt ?? "",
    });
  }

  return (
    <div>
      <PageHeader
        kicker="Customer 360°"
        title="One person, every desk"
        description="Customer master first. Leads, score, WhatsApp, booking, collections, snags hang off the same row. Local only."
      />
      <div className="space-y-3">
        {master.map((c) => {
          const theirs = scopedLeads.filter((l) => samePerson(c, l));
          const primary = theirs[0];
          const book =
            scopedBooks.find((b) => b.customerId === c.id) ??
            scopedBooks.find((b) => b.customer === c.name) ??
            (primary ? scopedBooks.find((b) => b.unit && b.unit === primary.unit) : undefined);
          const inv = units.find((u) => u.code === (book?.unit ?? primary?.unit));
          const owner = agents.find((a) => a.id === primary?.agentId);
          const shown = open === c.id;
          return (
            <Card key={c.id} className="p-4">
              <button type="button" className="flex w-full flex-wrap items-start justify-between gap-3 text-left" onClick={() => setOpen(shown ? null : c.id)}>
                <div>
                  <p className="font-display text-xl">{c.name}</p>
                  <p className="text-sm text-muted">
                    {c.phone || "no phone"} · {c.source ?? "master"}
                    {primary ? ` · ${STAGE_LABEL[primary.stage]}` : " · no live lead"}
                    {owner ? ` · ${owner.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {primary?.band ? <Status value={primary.band} /> : null}
                  {book ? <Status value={book.status} /> : null}
                </div>
              </button>
              {shown ? (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Master</p>
                    <p className="text-sm">
                      {book?.unit ?? primary?.unit ?? "—"} {inv ? `· ${inv.status} · ${inr(inv.price, true)}` : ""}
                    </p>
                    {primary?.budget ? <p className="text-sm text-muted">Budget {inr(primary.budget, true)}</p> : null}
                    <p className="mt-2 text-sm">{primary?.note ?? "Customer master row."}</p>
                    {primary ? (
                      <Button className="mt-3 h-11" variant="outline" onClick={() => toast(toggleWaConsent(primary.id) ?? "Consent updated.")}>
                        WhatsApp consent: {primary.waConsent ? "on" : "off"}
                      </Button>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Score & desk</p>
                    {primary ? (
                      <>
                        <p className="text-sm">
                          {primary.currentScore ?? primary.score ?? "—"} · {(primary.currentScoreReasons ?? primary.scoreReasons ?? []).join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-muted">{primary.scoreModel ?? "unscored"}</p>
                        <ul className="mt-2 space-y-1 text-xs text-muted">
                          {scoreHistory
                            .filter((s) => theirs.some((l) => l.id === s.leadId))
                            .slice(0, 3)
                            .map((s) => (
                              <li key={s.id}>
                                {s.at.slice(0, 10)} · {s.score} {s.band} · {s.model}
                              </li>
                            ))}
                          {leadActivities.filter((a) => theirs.some((l) => l.id === a.leadId)).length} events ·{" "}
                          {waSends.filter((w) => theirs.some((l) => l.id === w.leadId)).length} WhatsApp
                        </ul>
                      </>
                    ) : (
                      <p className="text-sm text-muted">No pipeline lead on this master row.</p>
                    )}
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
                        .filter((s) => s.unit === (book?.unit ?? primary?.unit))
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
