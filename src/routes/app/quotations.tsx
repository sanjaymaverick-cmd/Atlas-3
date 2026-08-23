import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { useAtlas } from "@/lib/store";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/quotations")({ component: Quotations });

function Quotations() {
  const {
    rfqs,
    quotes,
    vendors,
    projects,
    entityId,
    projectId,
    createRfq,
    submitQuote,
    selectQuote,
    createPOFromQuote,
  } = useAtlas();

  const scopedProjects = useMemo(
    () => projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId)),
    [projects, entityId, projectId],
  );
  const projectIds = scopedProjects.map((p) => p.id);
  const scopedRfqs = rfqs.filter((r) => projectIds.includes(r.projectId));

  const [compareId, setCompareId] = useState<string | null>(
    scopedRfqs.find((r) => r.status === "open")?.id ?? scopedRfqs[0]?.id ?? null,
  );
  const [pid, setPid] = useState(projectIds[0] ?? "");
  const [title, setTitle] = useState("");
  const [pkg, setPkg] = useState("");
  const [due, setDue] = useState(todayIso());
  const [vendorId, setVendorId] = useState("v1");
  const [amount, setAmount] = useState("3000000");
  const [validity, setValidity] = useState("2026-10-15");
  const [exclusions, setExclusions] = useState("");

  const active = scopedRfqs.find((r) => r.id === compareId) ?? scopedRfqs[0];
  const activeQuotes = active ? quotes.filter((q) => q.rfqId === active.id) : [];

  return (
    <div>
      <PageHeader
        kicker="Commercial"
        title="Quotations"
        description="RFQ → compare → select → PO. Selection does not pay. The PO still waits in Approvals."
      />

      <Card className="mb-6 grid gap-3 p-5 sm:grid-cols-2">
        <Field label="Project">
          <select
            className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
          >
            {scopedProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Package">
          <Input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="Waterproofing" />
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Podium membrane supply" />
        </Field>
        <Field label="Due">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button
            onClick={() => {
              if (!title) return toast("Title required.");
              createRfq({
                projectId: pid,
                title,
                package: pkg || "General",
                due,
                required: true,
              });
              toast("RFQ raised.");
              setTitle("");
            }}
          >
            Raise RFQ
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 font-display text-2xl">RFQs</h2>
      <div className="mb-6 space-y-2">
        {scopedRfqs.map((r) => {
          const n = quotes.filter((q) => q.rfqId === r.id).length;
          return (
            <Card
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
                active?.id === r.id ? "border-primary" : ""
              }`}
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {r.package} · {projects.find((p) => p.id === r.projectId)?.code} · due {r.due}
                </p>
                <p className="font-display text-xl">{r.title}</p>
                <p className="text-sm text-muted">
                  {n} quote{n === 1 ? "" : "s"} · {r.required ? "quote required before PO" : "optional RFQ"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Status value={r.status} />
                <Button size="sm" variant="outline" onClick={() => setCompareId(r.id)}>
                  Compare
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {active ? (
        <>
          <h2 className="mb-3 font-display text-2xl">Compare · {active.title}</h2>
          <div className="mb-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Validity</th>
                  <th className="px-4 py-3 font-medium">Exclusions</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-muted">
                      No quotes yet. Submit one below.
                    </td>
                  </tr>
                ) : (
                  activeQuotes.map((q) => {
                    const v = vendors.find((x) => x.id === q.vendorId);
                    return (
                      <tr key={q.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium">{v?.name}</p>
                          <p className="text-xs text-muted">{v?.stage}</p>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{inr(q.amount, true)}</td>
                        <td className="px-4 py-3">{q.validity}</td>
                        <td className="max-w-[220px] px-4 py-3 text-xs text-muted">{q.exclusions}</td>
                        <td className="px-4 py-3">
                          <Status value={q.status} />
                        </td>
                        <td className="px-4 py-3">
                          {q.status === "submitted" && active.status === "open" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const err = selectQuote(q.id);
                                toast(err ?? "Quote selected. Create PO when ready.");
                              }}
                            >
                              Select
                            </Button>
                          ) : null}
                          {q.status === "selected" ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                const err = createPOFromQuote(q.id);
                                toast(err ?? "PO submitted — waiting in Approvals.");
                              }}
                            >
                              Create PO
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {active.status === "open" ? (
            <Card className="grid gap-3 p-5 sm:grid-cols-2">
              <h3 className="font-display text-lg sm:col-span-2">Submit quote</h3>
              <Field label="Vendor">
                <select
                  className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.stage})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (INR)">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Validity">
                <Input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} />
              </Field>
              <Field label="Exclusions">
                <Input value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Button
                  onClick={() => {
                    const err = submitQuote({
                      rfqId: active.id,
                      vendorId,
                      amount: Number(amount) || 0,
                      validity,
                      exclusions,
                    });
                    toast(err ?? "Quote recorded.");
                  }}
                >
                  Submit quote
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
