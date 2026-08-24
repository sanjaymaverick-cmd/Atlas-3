import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EntityChip } from "@/components/entity-chip";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { readAttachment } from "@/lib/attach";
import { useAtlas } from "@/lib/store";
import type { QuoteSource } from "@/lib/types";
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
    pos,
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
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "v_civ");
  const [amount, setAmount] = useState("3000000");
  const [validity, setValidity] = useState("2026-10-15");
  const [exclusions, setExclusions] = useState("");
  const [source, setSource] = useState<QuoteSource>("paper");
  const [tax, setTax] = useState("");
  const [paperFile, setPaperFile] = useState<File | null>(null);

  const active = scopedRfqs.find((r) => r.id === compareId) ?? scopedRfqs[0];
  const activeQuotes = active ? quotes.filter((q) => q.rfqId === active.id) : [];

  return (
    <div>
      <PageHeader
        title="Price quotes"
        description="Ask vendors for prices, compare them, pick one, then raise a purchase order. Paper, email, or WhatsApp quotes from vendors with no login register here. Picking a price does not pay anyone. Select still needs the vendor Active."
      />
      <GateBanner>
        You can only pick a price from an Active vendor. Raise the purchase order only after you pick. Atlas does not pay from this screen.
      </GateBanner>
      <div className="mb-3">
        <EntityChip projectId={pid} />
      </div>

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
              const err = createRfq({
                projectId: pid,
                title,
                package: pkg || "General",
                due,
                required: true,
              });
              toast(err ?? "Price request sent.");
              if (!err) setTitle("");
            }}
          >
            Ask for prices
          </Button>
        </div>
      </Card>

      <h2 className="mb-3 font-display text-2xl">Price requests</h2>
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
                  <th className="px-4 py-3 font-medium">Source</th>
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
                    <td colSpan={7} className="px-4 py-6 text-muted">
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
                        <td className="px-4 py-3 text-xs">
                          {q.source ?? "portal"}
                          {q.fileName ? (
                            <>
                              <br />
                              {q.fileDataUrl ? (
                                <a href={q.fileDataUrl} download={q.fileName} className="underline-offset-4 hover:underline">
                                  {q.fileName}
                                </a>
                              ) : (
                                q.fileName
                              )}
                            </>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {inr(q.amount, true)}
                          {q.taxAmount ? <span className="block text-xs text-muted">tax {inr(q.taxAmount, true)}</span> : null}
                        </td>
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
                          {q.status === "selected" && !pos.some((p) => p.quoteId === q.id) ? (
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
                          {q.status === "selected" && pos.some((p) => p.quoteId === q.id) ? (
                            <span className="text-xs text-muted">PO already raised</span>
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
              <Field label="How it arrived">
                <select
                  className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
                  value={source}
                  onChange={(e) => setSource(e.target.value as QuoteSource)}
                >
                  <option value="paper">Paper (printed)</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp photo</option>
                  <option value="portal">Typed here</option>
                </select>
              </Field>
              <Field label="Tax (₹, optional)">
                <Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
              </Field>
              <Field label="Scan / photo (PDF or JPG)">
                <Input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={(e) => setPaperFile(e.target.files?.[0] ?? null)} />
              </Field>
              <p className="sm:col-span-2 text-xs text-muted">
                Vendors often have no login. A supervisor can register a printed quote here. Selecting it for a PO still needs the vendor Active. Local demo stores a small copy in this browser (~1.2 MB).
              </p>
              <div className="sm:col-span-2">
                <Button
                  onClick={async () => {
                    let meta: { fileName?: string; fileKind?: string; fileSize?: number; fileDataUrl?: string; sha256?: string } = {};
                    if (paperFile) {
                      const read = await readAttachment(paperFile);
                      if ("error" in read) return toast(read.error);
                      meta = read;
                    }
                    const err = submitQuote({
                      rfqId: active.id,
                      vendorId,
                      amount: Number(amount) || 0,
                      validity,
                      exclusions,
                      source,
                      taxAmount: tax ? Number(tax) : undefined,
                      ...meta,
                    });
                    toast(err ?? "Quote recorded.");
                  }}
                >
                  Register quote
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
