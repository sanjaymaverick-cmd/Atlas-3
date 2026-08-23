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

export const Route = createFileRoute("/app/crm")({ component: Crm });

function Crm() {
  const {
    leads,
    partners,
    commissions,
    projects,
    entityId,
    projectId,
    addLead,
    advanceLead,
    loseLead,
    convertLead,
    addPartner,
    activatePartner,
    requestCommission,
  } = useAtlas();
  const scoped = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const ids = scoped.map((p) => p.id);
  const leadRows = leads.filter((l) => ids.includes(l.projectId));
  const commissionRows = commissions.filter((c) => ids.includes(c.projectId));
  const [pid, setPid] = useState(ids[0] ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [unit, setUnit] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [pname, setPname] = useState("");
  const [prate, setPrate] = useState("2.5");

  return (
    <div>
      <PageHeader
        kicker="CRM · inside Atlas"
        title="Leads & partners"
        description="Owner decision: build in Atlas, not a third-party CRM. Commission accrues on conversion; payment still needs approval. Tally remains the books."
      />

      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={pid} onChange={(e) => setPid(e.target.value)}>
            {scoped.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Unit interest">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="A-0802" />
        </Field>
        <Field label="Partner">
          <select className="h-11 rounded-md border border-line bg-surface px-3 text-sm" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            <option value="">Direct</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-end">
          <Button
            onClick={() => {
              if (!name) return toast("Name required.");
              addLead({
                projectId: pid,
                name,
                phone,
                source: partnerId ? "partner" : "walk-in",
                partnerId: partnerId || undefined,
                unit,
                note: "Captured locally",
              });
              toast("Lead captured.");
              setName("");
            }}
          >
            Capture lead
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 font-display text-2xl">Pipeline</h2>
      <div className="space-y-3">
        {leadRows.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {l.source} · {l.unit || "no unit"} · {partners.find((p) => p.id === l.partnerId)?.name ?? "direct"}
                </p>
                <p className="font-display text-xl">{l.name}</p>
                <p className="text-sm text-muted">{l.note}</p>
              </div>
              <Status value={l.stage} />
            </div>
            {l.stage !== "won" && l.stage !== "lost" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const err = advanceLead(l.id);
                    toast(err ?? "Advanced.");
                  }}
                >
                  Advance
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const err = convertLead(l.id, 7_500_000);
                    toast(err ?? "Booking created. Commission accrued if a partner is attached.");
                  }}
                >
                  Convert (₹75L)
                </Button>
                <Button size="sm" variant="outline" onClick={() => loseLead(l.id)}>
                  Lost
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Channel partners</h2>
      <Card className="mb-4 grid gap-3 p-5 sm:grid-cols-3">
        <Field label="Name">
          <Input value={pname} onChange={(e) => setPname(e.target.value)} />
        </Field>
        <Field label="Rate %">
          <Input value={prate} onChange={(e) => setPrate(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              if (!pname) return toast("Name required.");
              addPartner({ name: pname, city: "Jaipur", gstin: "—", rate: Number(prate) || 2 });
              toast("Partner invited.");
              setPname("");
            }}
          >
            Invite partner
          </Button>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {partners.map((p) => (
          <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted">
                {p.city} · {p.rate}% · {p.gstin}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={p.status} />
              {p.status !== "active" ? (
                <Button size="sm" variant="outline" onClick={() => activatePartner(p.id)}>
                  Activate
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Commission</h2>
      <div className="space-y-2">
        {commissionRows.map((c) => (
          <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{partners.find((p) => p.id === c.partnerId)?.name}</p>
              <p className="text-sm tabular-nums text-muted">{inr(c.amount, true)} · booking {c.bookingId}</p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={c.status} />
              {c.status === "accrued" ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const err = requestCommission(c.id);
                    toast(err ?? "Waiting in Approvals. Atlas will not pay from here.");
                  }}
                >
                  Send for approval
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
