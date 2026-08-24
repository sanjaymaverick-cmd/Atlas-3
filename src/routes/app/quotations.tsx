import { createFileRoute, Link } from "@tanstack/react-router";
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
import { PO_VENDOR_NOT_ACTIVE } from "@/lib/gates";
import { useAtlas } from "@/lib/store";
import type { QuoteSource } from "@/lib/types";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/quotations")({ component: Quotations });

const STEPS = [
  { n: 1, title: "Ask for prices" },
  { n: 2, title: "Attach the quote" },
  { n: 3, title: "Pick the Active quote" },
  { n: 4, title: "Raise the purchase order" },
] as const;

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

  const [step, setStep] = useState(1);
  const [compareId, setCompareId] = useState<string | null>(
    scopedRfqs.find((r) => r.status === "open")?.id ?? scopedRfqs.find((r) => r.status === "awarded")?.id ?? scopedRfqs[0]?.id ?? null,
  );
  const [pid, setPid] = useState(projectIds[0] ?? "");
  const [title, setTitle] = useState("");
  const [pkg, setPkg] = useState("Structure / civil");
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
  const selected = activeQuotes.find((q) => q.status === "selected");
  const selectedVendor = selected ? vendors.find((v) => v.id === selected.vendorId) : undefined;
  const poExists = selected ? pos.some((p) => p.quoteId === selected.id) : false;

  function go(n: number) {
    setStep(Math.min(4, Math.max(1, n)));
  }

  return (
    <div>
      <PageHeader
        title="Price to purchase order"
        description="Four steps. Ask for prices, photograph the paper or WhatsApp quote, pick an Active vendor, raise the purchase order. Atlas does not pay from this screen."
      />
      <ol className="mb-6 grid gap-2 sm:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n}>
            <button
              type="button"
              className={`flex h-11 w-full items-center gap-2 rounded-md border px-3 text-left text-sm ${
                step === s.n ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface"
              }`}
              onClick={() => go(s.n)}
            >
              <span className="tabular-nums">{s.n}</span>
              <span className="truncate">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <Card className="grid gap-3 p-5 sm:grid-cols-2">
          <p className="sm:col-span-2 text-sm text-muted">Name the package. You will attach the vendor’s paper quote in the next step.</p>
          <div className="sm:col-span-2">
            <EntityChip projectId={pid} />
          </div>
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
            <Input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="Structure / civil" />
          </Field>
          <Field label="What are you buying?">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Podium membrane supply" />
          </Field>
          <Field label="Need prices by">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          {scopedRfqs.length ? (
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs text-muted">Or open an existing price request</p>
              <div className="flex flex-wrap gap-2">
                {scopedRfqs.map((r) => (
                  <Button
                    key={r.id}
                    size="sm"
                    variant={active?.id === r.id ? "default" : "outline"}
                    onClick={() => {
                      setCompareId(r.id);
                      go(r.status === "awarded" ? 4 : quotes.some((q) => q.rfqId === r.id) ? 3 : 2);
                    }}
                  >
                    {r.title}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button
              className="h-12 w-full sm:w-auto"
              onClick={() => {
                if (!title) return toast("Write what you are buying, in plain words.");
                const err = createRfq({
                  projectId: pid,
                  title,
                  package: pkg || "General",
                  due,
                  required: true,
                });
                if (err) return toast(err);
                const created = useAtlas.getState().rfqs.find((r) => r.projectId === pid && r.title === title);
                if (created) setCompareId(created.id);
                toast("Price request saved. Attach the paper or WhatsApp quote next.");
                setTitle("");
                go(2);
              }}
            >
              Ask for prices
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="grid gap-3 p-5 sm:grid-cols-2">
          {!active ? (
            <p className="sm:col-span-2 text-sm text-muted">Ask for prices first.</p>
          ) : (
            <>
              <p className="sm:col-span-2 text-sm text-muted">
                Photograph the paper quote or WhatsApp screenshot. Type the amount. Keep the file — it stays with this request.
              </p>
              <p className="sm:col-span-2 font-display text-xl">{active.title}</p>
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
              <Field label="Amount (₹)">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Photo or PDF of the quote">
                <Input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png"
                  capture="environment"
                  onChange={(e) => setPaperFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label="How it arrived">
                <select
                  className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
                  value={source}
                  onChange={(e) => setSource(e.target.value as QuoteSource)}
                >
                  <option value="paper">Paper (printed)</option>
                  <option value="whatsapp">WhatsApp photo</option>
                  <option value="email">Email</option>
                  <option value="portal">Typed here</option>
                </select>
              </Field>
              <Field label="Valid until">
                <Input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} />
              </Field>
              <Field label="Tax (₹, optional)">
                <Input type="number" value={tax} onChange={(e) => setTax(e.target.value)} />
              </Field>
              <Field label="What is not included (optional)">
                <Input value={exclusions} onChange={(e) => setExclusions(e.target.value)} />
              </Field>
              {paperFile ? <p className="sm:col-span-2 text-xs text-muted">Attached: {paperFile.name}</p> : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => go(1)}>
                  Back
                </Button>
                <Button
                  className="h-12"
                  onClick={async () => {
                    if (active.status !== "open") return toast("This price request is closed.");
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
                    if (err) return toast(err);
                    toast("Quote recorded with the file name kept on this request.");
                    go(3);
                  }}
                >
                  Register quote
                </Button>
              </div>
            </>
          )}
        </Card>
      ) : null}

      {step === 3 ? (
        <div>
          {!active ? (
            <p className="text-sm text-muted">Ask for prices first.</p>
          ) : (
            <>
              <h2 className="mb-3 font-display text-2xl">Pick one quote · {active.title}</h2>
              {activeQuotes.some((q) => vendors.find((v) => v.id === q.vendorId)?.stage !== "active") ? (
                <GateBanner>
                  {PO_VENDOR_NOT_ACTIVE}{" "}
                  <Link to="/app/approvals" className="underline-offset-4 hover:underline">
                    Open Approvals
                  </Link>
                </GateBanner>
              ) : (
                <GateBanner>Only an Active vendor can be picked. Picking a price does not pay anyone.</GateBanner>
              )}
              <div className="mb-4 space-y-2">
                {activeQuotes.length === 0 ? (
                  <Card className="p-4 text-sm text-muted">No quotes yet. Attach one in step 2.</Card>
                ) : (
                  activeQuotes.map((q) => {
                    const v = vendors.find((x) => x.id === q.vendorId);
                    const canSelect = q.status === "submitted" && active.status === "open";
                    return (
                      <Card key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium">{v?.name}</p>
                          <p className="text-xs text-muted">
                            {v?.stage} · {q.source ?? "portal"}
                            {q.fileName ? ` · ${q.fileName}` : ""}
                          </p>
                          <p className="tabular-nums">{inr(q.amount, true)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Status value={q.status} />
                          {canSelect ? (
                            <Button
                              onClick={() => {
                                const err = selectQuote(q.id);
                                if (err) {
                                  toast(err);
                                  return;
                                }
                                toast("Quote selected. Raise the purchase order next.");
                                go(4);
                              }}
                            >
                              Select this quote
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
              <Button variant="outline" onClick={() => go(2)}>
                Back
              </Button>
            </>
          )}
        </div>
      ) : null}

      {step === 4 ? (
        <Card className="grid gap-3 p-5">
          {!selected ? (
            <p className="text-sm text-muted">Pick an Active vendor quote first.</p>
          ) : (
            <>
              <p className="font-display text-xl">{active?.title}</p>
              <p className="text-sm">
                {selectedVendor?.name} · {inr(selected.amount, true)}
                {selected.fileName ? ` · ${selected.fileName}` : ""}
              </p>
              {selectedVendor?.stage !== "active" ? (
                <GateBanner>
                  {PO_VENDOR_NOT_ACTIVE}{" "}
                  <Link to="/app/approvals" className="underline-offset-4 hover:underline">
                    Open Approvals
                  </Link>
                </GateBanner>
              ) : poExists ? (
                <p className="text-sm text-muted">Purchase order already raised. Waiting in Approvals.</p>
              ) : (
                <p className="text-sm text-muted">This sends the order to Approvals. Atlas does not pay from here.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => go(3)}>
                  Back
                </Button>
                {!poExists ? (
                  <Button
                    className="h-12"
                    onClick={() => {
                      const err = createPOFromQuote(selected.id);
                      toast(err ?? "PO submitted — waiting in Approvals.");
                    }}
                  >
                    Raise purchase order
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/app/approvals">Open Approvals</Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      ) : null}
    </div>
  );
}
