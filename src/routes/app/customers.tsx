import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { availableUnitsFor, unitConfig } from "@/lib/unit-pick";
import { daysOverdue, inr } from "@/lib/utils";

export const Route = createFileRoute("/app/customers")({ component: Customers });

function Customers() {
  const {
    bookings,
    payments,
    snags,
    projects,
    entityId,
    projectId,
    units,
    towers,
    addBooking,
    bookNextAvailable,
    collect,
    markPossession,
    cancelBooking,
    closeSnag,
  } = useAtlas();
  const scoped = projects.filter(
    (p) => p.entityId === entityId && (projectId === "all" || p.id === projectId),
  );
  const ids = scoped.map((p) => p.id);
  const rows = bookings.filter((b) => ids.includes(b.projectId));
  const [pid, setPid] = useState(ids[0] ?? "");
  const [bhk, setBhk] = useState<"" | "2BHK" | "3BHK">("");
  const free = useMemo(
    () => availableUnitsFor(units, towers, pid, { config: bhk || undefined }),
    [units, towers, pid, bhk],
  );
  const [unit, setUnit] = useState(free[0]?.code ?? "");
  const [customer, setCustomer] = useState("");
  const selected = free.find((u) => u.code === unit) ?? free[0];

  return (
    <div>
      <PageHeader
        kicker="Phase 8"
        title="Customers"
        description="Pick a free unit from the list. Do not type AVA- / SFA- / ACA- prefixes. One active booking per unit."
      />
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={pid}
            onChange={(e) => {
              setPid(e.target.value);
              setUnit("");
            }}
          >
            {scoped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">BHK</p>
          <div className="flex flex-wrap gap-2">
            {(["", "2BHK", "3BHK"] as const).map((id) => (
              <Button
                key={id || "all"}
                size="sm"
                variant={bhk === id ? "default" : "outline"}
                onClick={() => {
                  setBhk(id);
                  setUnit("");
                }}
              >
                {id || "All free"}
              </Button>
            ))}
          </div>
        </div>
        <Field label="Free unit (tap a row)">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={selected?.code ?? ""}
            onChange={(e) => setUnit(e.target.value)}
          >
            {free.length === 0 ? <option value="">No free units in this list</option> : null}
            {free.map((u) => (
              <option key={u.id} value={u.code}>
                {u.code} · {unitConfig(u, towers) || u.kind} · {inr(u.price, true)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer name">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Walk-in"
          />
        </Field>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button
            className="h-12"
            onClick={() => {
              if (!selected) return toast("No free unit in this list.");
              const err = addBooking({
                projectId: pid,
                unit: selected.code,
                customer: customer || `Walk-in ${selected.code}`,
                value: selected.price,
              });
              if (err) toast(err);
              else toast(`Booked ${selected.code}.`);
            }}
          >
            Book this unit
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={() => {
              const err = bookNextAvailable(pid, {
                config: bhk || undefined,
                customer: customer || undefined,
              });
              toast(err ?? "Booked the next free unit in this list.");
            }}
          >
            Book next in this list
          </Button>
        </div>
      </Card>

      {(() => {
        const overdueDays = rows.map((b) => {
          const next = payments.find((p) => p.bookingId === b.id && p.paid < p.amount);
          return next ? daysOverdue(next.due) : 0;
        });
        const d30 = overdueDays.filter((d) => d > 0 && d <= 30).length;
        const d60 = overdueDays.filter((d) => d > 30 && d <= 60).length;
        const d90 = overdueDays.filter((d) => d > 60 && d <= 90).length;
        const d90plus = overdueDays.filter((d) => d > 90).length;
        return (
          <div className="mb-6 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-line px-3 py-1">0–30d {d30}</span>
            <span className="rounded-full border border-line px-3 py-1">31–60d {d60}</span>
            <span className="rounded-full border border-line px-3 py-1">61–90d {d90}</span>
            <span className="rounded-full border border-line px-3 py-1">90d+ {d90plus}</span>
          </div>
        );
      })()}
      <div className="space-y-3">
        {rows.map((b) => {
          const pct = b.value ? Math.round((b.collected / b.value) * 100) : 0;
          return (
            <Card key={b.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{b.unit}</p>
                  <h2 className="font-display text-2xl">{b.customer}</h2>
                  <p className="text-sm text-muted">
                    {inr(b.collected, true)} of {inr(b.value, true)}
                  </p>
                </div>
                <Status value={b.status} />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-chip">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {payments
                  .filter((p) => p.bookingId === b.id)
                  .map((p) => {
                    const unpaid = p.paid < p.amount;
                    const isNext =
                      unpaid &&
                      !payments.some(
                        (x) => x.bookingId === b.id && x.paid < x.amount && x.due < p.due,
                      );
                    return (
                      <li
                        key={p.id}
                        className={`flex justify-between gap-3 rounded-md px-2 py-1 ${isNext ? "bg-chip text-ink" : "text-muted"}`}
                      >
                        <span>
                          {p.label} · {p.due}
                          {isNext ? " · next unpaid" : ""}
                        </span>
                        <span className="tabular-nums">
                          {inr(p.paid, true)} / {inr(p.amount, true)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
              <ul className="mt-2 space-y-1 text-xs">
                {snags
                  .filter((s) => s.unit === b.unit)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span>{s.title}</span>
                      {s.status === "open" ? (
                        <Button size="sm" variant="outline" onClick={() => closeSnag(s.id)}>
                          Close defect
                        </Button>
                      ) : (
                        <span className="text-muted">closed</span>
                      )}
                    </li>
                  ))}
              </ul>
              {b.status === "active" ? (
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    const steps = payments.filter((p) => p.bookingId === b.id);
                    const next = steps.find((p) => p.paid < p.amount);
                    const amt = next ? next.amount - next.paid : Math.round(b.value * 0.1);
                    const err = collect(b.id, amt);
                    if (err) toast(err);
                    else
                      toast(next ? `Collected next step: ${next.label}` : "Collection recorded.");
                  }}
                >
                  Collect next installment
                </Button>
              ) : null}
              {b.status === "active" ? (
                <Button
                  size="sm"
                  className="mt-4 ml-2"
                  variant="outline"
                  onClick={() => {
                    const err = markPossession(b.id);
                    toast(err ?? "Possession recorded.");
                  }}
                >
                  Record possession
                </Button>
              ) : null}
              {b.status === "active" ? (
                <Button
                  size="sm"
                  className="mt-4 ml-2"
                  variant="outline"
                  onClick={() => {
                    const err = cancelBooking(b.id);
                    toast(err ?? "Booking cancelled. Unit is free.");
                  }}
                >
                  Cancel booking
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
