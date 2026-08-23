import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/customers")({ component: Customers });

function Customers() {
  const { bookings, payments, snags, projects, entityId, projectId, addBooking, collect, markPossession, cancelBooking, closeSnag } = useAtlas();
  const scoped = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = scoped.map((p) => p.id);
  const rows = bookings.filter((b) => ids.includes(b.projectId));
  const [pid, setPid] = useState(ids[0] ?? "");
  const [unit, setUnit] = useState("");
  const [customer, setCustomer] = useState("");
  const [value, setValue] = useState("6500000");

  return (
    <div>
      <PageHeader
        kicker="Phase 8"
        title="Customers"
        description="One active booking per unit. Collections cannot over-allocate the plan."
      />
      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
          >
            {scoped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="A-0802" />
        </Field>
        <Field label="Customer">
          <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </Field>
        <Field label="Agreement value (INR)">
          <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button
            onClick={() => {
              const err = addBooking({
                projectId: pid,
                unit: unit || "X-000",
                customer: customer || "Walk-in",
                value: Number(value) || 0,
              });
              if (err) toast(err);
              else toast("Booking created.");
            }}
          >
            Book unit
          </Button>
        </div>
      </Card>

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
                {payments.filter((p) => p.bookingId === b.id).map((p) => {
                  const unpaid = p.paid < p.amount;
                  const isNext = unpaid && !payments.some((x) => x.bookingId === b.id && x.paid < x.amount && x.due < p.due);
                  return (
                  <li key={p.id} className={`flex justify-between gap-3 rounded-md px-2 py-1 ${isNext ? "bg-chip text-ink" : "text-muted"}`}>
                    <span>{p.label} · {p.due}{isNext ? " · next unpaid" : ""}</span>
                    <span className="tabular-nums">{inr(p.paid, true)} / {inr(p.amount, true)}</span>
                  </li>
                  );
                })}
              </ul>
              <ul className="mt-2 space-y-1 text-xs">
                {snags.filter((s) => s.unit === b.unit).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span>{s.title}</span>
                    {s.status === "open" ? (
                      <Button size="sm" variant="outline" onClick={() => closeSnag(s.id)}>Close snag</Button>
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
                  variant="outline"
                  onClick={() => {
                    const steps = payments.filter((p) => p.bookingId === b.id);
                    const next = steps.find((p) => p.paid < p.amount);
                    const amt = next ? next.amount - next.paid : Math.round(b.value * 0.1);
                    const err = collect(b.id, amt);
                    if (err) toast(err);
                    else toast(next ? `Collected next step: ${next.label}` : "Collection recorded.");
                  }}
                >
                  Collect next installment
                </Button>
              ) : null}
              {b.status === "active" ? (
                <Button
                  size="sm"
                  className="mt-4 ml-2"
                  onClick={() => {
                    const err = markPossession(b.id);
                    toast(err ?? "Possession recorded.");
                  }}
                >
                  Record possession
                </Button>
              ) : null}
              {b.status === "active" ? (
                <Button size="sm" className="mt-4 ml-2" variant="outline" onClick={() => {
                  const err = cancelBooking(b.id);
                  toast(err ?? "Booking cancelled. Unit is free.");
                }}>Cancel booking</Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
