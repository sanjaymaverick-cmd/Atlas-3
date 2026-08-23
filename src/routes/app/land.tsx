import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

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
    payEmi,
    acquireParcel,
  } = useAtlas();

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

  return (
    <div>
      <PageHeader
        kicker="Phase 3"
        title="Land & legal"
        description="Acquisition is blocked until due diligence is clear. EMI here is an operations reference — Tally remains the books."
      />

      <div className="space-y-4">
        {scopedParcels.map((r) => {
          const p = projects.find((x) => x.id === r.projectId);
          const items = diligence.filter((d) => d.parcelId === r.id);
          const loanEmis = emis.filter((e) => e.parcelId === r.id);
          return (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {p?.code} · Khasra {r.khasra}
                  </p>
                  <h2 className="font-display text-2xl">{r.name}</h2>
                  <p className="text-sm text-muted">{r.area}</p>
                </div>
                <Status value={r.status === "acquired" ? "approved" : r.status === "diligence" ? "review" : r.status} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">RERA</dt>
                  <dd className="tabular-nums">{r.rera}</dd>
                </div>
                <div>
                  <dt className="text-muted">Term loan (ops. ref)</dt>
                  <dd className="tabular-nums">{r.loan ? inr(r.loan, true) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Open diligence</dt>
                  <dd>{items.filter((i) => i.status !== "clear").length}</dd>
                </div>
              </dl>
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
              {loanEmis.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {loanEmis.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2">
                      <span>
                        EMI {e.due} · {inr(e.amount, true)}
                      </span>
                      {e.status === "due" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const err = payEmi(e.id);
                            toast(err ?? "EMI recorded in operations. Posting stays in Tally.");
                          }}
                        >
                          Record paid
                        </Button>
                      ) : (
                        <Status value="approved" />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {r.status !== "acquired" ? (
                <Button
                  className="mt-4"
                  onClick={() => {
                    const err = acquireParcel(r.id);
                    toast(err ?? "Parcel marked acquired.");
                  }}
                >
                  Complete acquisition
                </Button>
              ) : null}
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
                <Button size="sm" variant="outline" onClick={() => fileObligation(o.id)}>
                  Mark filed
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
