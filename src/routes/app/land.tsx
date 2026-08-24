import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EntityChip } from "@/components/entity-chip";
import { GateBanner } from "@/components/gate-banner";
import { Hint } from "@/components/hint";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { CHALLAN_REQUIRED } from "@/lib/gates";
import { useAtlas } from "@/lib/store";
import type { Obligation } from "@/lib/types";
import { inr, todayIso } from "@/lib/utils";

export const Route = createFileRoute("/app/land")({ component: Land });

function Land() {
  const {
    parcels,
    diligence,
    obligations,
    emis,
    projects,
    entityId,
    projectId,
    setDiligence,
    fileObligation,
    addParcel,
    addObligation,
    payEmi,
    acquireParcel,
    recordParcelDeed,
    startDiligencePack,
    clearDiligencePack,
    fundingSanctions,
  } = useAtlas();
  const [deed, setDeed] = useState<Record<string, { inr: string; no: string; date: string; advocate: string }>>({});
  const [ack, setAck] = useState<Record<string, string>>({});
  const [landStep, setLandStep] = useState<Record<string, 1 | 2 | 3>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [pname, setPname] = useState("");
  const [khasra, setKhasra] = useState("");
  const [area, setArea] = useState("");
  const [rera, setRera] = useState("");
  const [otitle, setOtitle] = useState("");
  const [okind, setOkind] = useState<Obligation["kind"]>("rera");
  const [odue, setOdue] = useState(todayIso());

  const scopedParcels = parcels.filter((row) => {
    const p = projects.find((x) => x.id === row.projectId);
    if (!p || p.entityId !== entityId) return false;
    if (projectId !== "all" && row.projectId !== projectId) return false;
    return true;
  });
  const scopedObs = obligations.filter((o) => {
    const p = projects.find((x) => x.id === o.projectId);
    if (!p || p.entityId !== entityId) return false;
    if (projectId !== "all" && o.projectId !== projectId) return false;
    return true;
  });
  const addPid = scopedParcels[0]?.projectId ?? projects.find((p) => p.entityId === entityId)?.id ?? "";

  return (
    <div>
      <PageHeader
        kicker="Phase 3"
        title="Land & acquisition"
        description="You cannot buy the land until title checks are clear. Consideration and sale deed are required on acquire. Loan instalments here are only a reminder — the real accounts stay in ERPNext."
      />

      <div className="mb-6">
        <Button variant="outline" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Close" : "Add parcel or obligation"}
        </Button>
      </div>
      {showAdd ? (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card className="grid gap-3 p-5">
            <h2 className="font-display text-xl">Add parcel</h2>
            <Field label="Name">
              <Input value={pname} onChange={(e) => setPname(e.target.value)} />
            </Field>
            <Field label="Khasra">
              <Input value={khasra} onChange={(e) => setKhasra(e.target.value)} />
            </Field>
            <Field label="Area">
              <Input value={area} onChange={(e) => setArea(e.target.value)} />
            </Field>
            <Field label="RERA">
              <Input value={rera} onChange={(e) => setRera(e.target.value)} />
            </Field>
            <Button
              variant="outline"
              onClick={() => {
                const err = addParcel({ projectId: addPid, name: pname, khasra, area, rera });
                toast(err ?? "Parcel added.");
                if (!err) {
                  setPname("");
                  setKhasra("");
                }
              }}
            >
              Add parcel
            </Button>
          </Card>
          <Card className="grid gap-3 p-5">
            <h2 className="font-display text-xl">Add obligation</h2>
            <Field label="Title">
              <Input value={otitle} onChange={(e) => setOtitle(e.target.value)} />
            </Field>
            <Field label="Kind">
              <select
                className="h-11 rounded-md border border-line bg-surface px-3 text-sm"
                value={okind}
                onChange={(e) => setOkind(e.target.value as Obligation["kind"])}
              >
                <option value="rera">RERA</option>
                <option value="labour">Labour</option>
                <option value="insurance">Insurance</option>
                <option value="tax">Tax</option>
              </select>
            </Field>
            <Field label="Due">
              <Input type="date" value={odue} onChange={(e) => setOdue(e.target.value)} />
            </Field>
            <Button
              variant="outline"
              onClick={() => {
                const err = addObligation({ projectId: addPid, kind: okind, title: otitle, due: odue });
                toast(err ?? "Obligation added.");
                if (!err) setOtitle("");
              }}
            >
              Add obligation
            </Button>
          </Card>
        </div>
      ) : null}
      <div className="space-y-4">
        {scopedParcels.map((r) => {
          const p = projects.find((x) => x.id === r.projectId);
          const items = diligence.filter((d) => d.parcelId === r.id);
          const loanEmis = emis.filter((e) => e.parcelId === r.id);
          const fund = fundingSanctions.find((f) => f.projectId === r.projectId);
          const readyToBuy = r.status !== "acquired" && items.length > 0 && items.every((i) => i.status === "clear");
          return (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {p?.code} · Khasra {r.khasra}
                  </p>
                  <h2 className="font-display text-2xl">{r.name}</h2>
                  <p className="text-sm text-muted">
                    {r.area}
                    {r.status === "identified" ? (
                      <>
                        {" "}
                        · <Hint term="identified">not yet owned</Hint>
                      </>
                    ) : null}
                  </p>
                  <EntityChip projectId={r.projectId} />
                  {fund ? (
                    <p className="mt-1 text-xs text-muted">
                      Construction finance: {fund.bank} {fund.loanPct}/{fund.equityPct} · {fund.sanctionNo}
                    </p>
                  ) : r.status === "acquired" ? (
                    <p className="mt-1 text-xs text-muted">
                      No sanction on this project.{" "}
                      <Link to="/app/finance" className="underline-offset-4 hover:underline">
                        Record on Company accounts
                      </Link>
                    </p>
                  ) : null}
                </div>
                <Status value={r.status === "acquired" ? "approved" : r.status === "diligence" ? "review" : r.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">RERA</dt>
                  <dd className="tabular-nums">
                    {obligations.some((o) => o.projectId === r.projectId && o.kind === "rera" && o.status === "filed")
                      ? r.rera
                      : r.rera
                        ? `Target ${r.rera} — not filed`
                        : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Consideration</dt>
                  <dd className="tabular-nums">{r.considerationInr ? inr(r.considerationInr, true) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Sale deed</dt>
                  <dd>{r.saleDeedNo || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Open diligence</dt>
                  <dd>{items.filter((i) => i.status !== "clear").length}</dd>
                </div>
              </dl>
              {r.status === "identified" ? (
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => toast(startDiligencePack(r.id) ?? "Standard title pack opened (five checks).")}
                >
                  Start standard title pack
                </Button>
              ) : null}
              {items.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {items.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{i.title}</span>
                      <span className="flex items-center gap-2">
                        <Status value={i.status === "clear" ? "approved" : i.status === "flagged" ? "fail" : "pending"} />
                        {i.status !== "clear" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setDiligence(i.id, "flagged")}>
                              Flag
                            </Button>
                            <Button size="sm" onClick={() => setDiligence(i.id, "clear")}>
                              Clear
                            </Button>
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {items.some((i) => i.status !== "clear") ? (
                <Button
                  className="mt-3"
                  variant="outline"
                  size="sm"
                  onClick={() => toast(clearDiligencePack(r.id) ?? "Pack marked clear.")}
                >
                  Mark pack complete
                </Button>
              ) : null}
              {loanEmis.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {loanEmis.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span>
                        Loan instalment {e.due} · {inr(e.amount, true)}
                      </span>
                      {e.status === "due" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const err = payEmi(e.id);
                            toast(err ?? "Marked paid in operations. Books stay in ERPNext.");
                          }}
                        >
                          Mark paid in ops
                        </Button>
                      ) : (
                        <Status value="approved" />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {readyToBuy ? (
                <GateBanner>Title pack is clear. Step 1: consideration ₹. Step 2: sale deed number. Step 3: RERA challan before you mark filed.</GateBanner>
              ) : null}
              {(() => {
                const reraObs = scopedObs.filter((o) => o.projectId === r.projectId && o.kind === "rera");
                const defaultStep: 1 | 2 | 3 = r.status !== "acquired" ? 1 : 3;
                const step = landStep[r.id] ?? defaultStep;
                const setStep = (n: 1 | 2 | 3) => setLandStep((s) => ({ ...s, [r.id]: n }));
                const d = deed[r.id] ?? { inr: "", no: "", date: todayIso(), advocate: "" };
                const patch = (partial: Partial<typeof d>) =>
                  setDeed((s) => ({ ...s, [r.id]: { inr: s[r.id]?.inr ?? "", no: s[r.id]?.no ?? "", date: s[r.id]?.date ?? todayIso(), advocate: s[r.id]?.advocate ?? "", ...partial } }));
                return (
                  <div className={`mt-4 ${readyToBuy || r.status === "acquired" ? "rounded-xl border border-primary/40 p-4" : ""}`}>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(["Consideration ₹", "Sale deed number", "RERA challan"] as const).map((label, i) => {
                        const n = (i + 1) as 1 | 2 | 3;
                        return (
                          <Button key={n} size="sm" variant={step === n ? "default" : "outline"} onClick={() => setStep(n)}>
                            {n}. {label}
                          </Button>
                        );
                      })}
                    </div>
                    {step === 1 ? (
                      <div className="grid gap-3">
                        <Field label="Consideration (₹)">
                          <Input type="number" value={d.inr} onChange={(e) => patch({ inr: e.target.value })} />
                        </Field>
                        <Button
                          className="h-12 w-full sm:w-auto"
                          onClick={() => {
                            if (!Number(d.inr)) return toast("Enter the consideration in rupees.");
                            setStep(2);
                          }}
                        >
                          Next — sale deed
                        </Button>
                      </div>
                    ) : null}
                    {step === 2 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Sale deed number">
                          <Input value={d.no} onChange={(e) => patch({ no: e.target.value })} />
                        </Field>
                        <Field label="Sale deed date">
                          <Input type="date" value={d.date} onChange={(e) => patch({ date: e.target.value })} />
                        </Field>
                        <Field label="Advocate (optional)">
                          <Input value={d.advocate} onChange={(e) => patch({ advocate: e.target.value })} />
                        </Field>
                        <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                          <Button variant="outline" onClick={() => setStep(1)}>
                            Back
                          </Button>
                          {r.status !== "acquired" ? (
                            <Button
                              className="h-12"
                              onClick={() => {
                                const err = acquireParcel(r.id, {
                                  considerationInr: Number(d.inr) || 0,
                                  saleDeedNo: d.no,
                                  saleDeedDate: d.date,
                                  advocateName: d.advocate,
                                });
                                if (err) return toast(err);
                                toast("Parcel marked acquired. File RERA with a challan next.");
                                setStep(3);
                              }}
                            >
                              Complete acquisition
                            </Button>
                          ) : (
                            <Button
                              className="h-12"
                              onClick={() => {
                                const err = recordParcelDeed(r.id, {
                                  considerationInr: Number(d.inr) || 0,
                                  saleDeedNo: d.no,
                                  saleDeedDate: d.date,
                                  advocateName: d.advocate,
                                });
                                if (err) return toast(err);
                                toast("Consideration and sale deed recorded.");
                                setStep(3);
                              }}
                            >
                              Save sale deed
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null}
                    {step === 3 ? (
                      <div className="grid gap-3">
                        <p className="text-sm text-muted">{CHALLAN_REQUIRED}</p>
                        {reraObs.length === 0 ? (
                          <p className="text-sm text-muted">No RERA obligation on this project yet. Add one below if needed.</p>
                        ) : (
                          reraObs.map((o) => (
                            <div key={o.id} className="flex flex-wrap items-end gap-2">
                              <div className="min-w-[12rem] flex-1">
                                <p className="font-medium">{o.title}</p>
                                <p className="text-xs text-muted">Due {o.due}{o.filedRef ? ` · ${o.filedRef}` : ""}</p>
                              </div>
                              {o.status !== "filed" ? (
                                <>
                                  <Field label="Challan / acknowledgement (required)">
                                    <Input
                                      className="h-11 w-56"
                                      placeholder="e.g. ACK-RAJ/P/2024/2144"
                                      value={ack[o.id] ?? ""}
                                      onChange={(e) => setAck((s) => ({ ...s, [o.id]: e.target.value }))}
                                      aria-required
                                    />
                                  </Field>
                                  <Button
                                    className="h-12"
                                    onClick={() => {
                                      const err = fileObligation(o.id, ack[o.id] ?? "");
                                      toast(err ?? "RERA marked filed with challan.");
                                    }}
                                  >
                                    Mark filed
                                  </Button>
                                </>
                              ) : (
                                <Status value="approved" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl">Statutory obligations</h2>
      <div className="space-y-2">
        {scopedObs.map((o) => (
          <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{o.kind}</p>
              <p className="font-medium">{o.title}</p>
              <p className="text-xs text-muted">Due {o.due}</p>
            </div>
            <div className="flex items-center gap-2">
              <Status value={o.status === "filed" ? "approved" : o.status === "overdue" ? "fail" : "pending"} />
              {o.status !== "filed" ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Challan / acknowledgement (required)">
                    <Input
                      className="h-11 w-48"
                      placeholder="e.g. ACK-RAJ/P/2024/2144"
                      value={ack[o.id] ?? ""}
                      onChange={(e) => setAck((s) => ({ ...s, [o.id]: e.target.value }))}
                      aria-required
                    />
                  </Field>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mb-0.5"
                    onClick={() => {
                      const err = fileObligation(o.id, ack[o.id] ?? "");
                      toast(err ?? "Marked filed.");
                    }}
                  >
                    Mark filed
                  </Button>
                </div>
              ) : o.filedRef ? (
                <span className="text-xs text-muted">{o.filedRef}</span>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
