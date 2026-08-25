import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PHASES } from "@/lib/phases";
import { ROLE_LABEL } from "@/lib/roles";
import { USERS } from "@/lib/seed";
import { useAtlas } from "@/lib/store";

export const Route = createFileRoute("/app/testing")({ component: Testing });

function Testing() {
  const { runCompanyDay, companyDay } = useAtlas();
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <PageHeader
        kicker="UAT · not live"
        title="Company day"
        description="Local UAT. Prove invariants on this host. Atlas never posts ERPNext vouchers. Not live."
      />

      <Card className="mb-6 p-5">
        <h2 className="font-display text-xl">Run the day</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Twelve seats, including Pink City agent and company admin. Failures are the point: a
          refuse for the right reason is a pass. ERPNext at D:\ERPNext stays MOCK ATLAS3 LLP — Atlas
          never posts. UI notes from each desk are listed after the run.
        </p>
        <Button
          className="mt-4 h-12"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void runCompanyDay()
              .then((r) => {
                toast(
                  r.failed
                    ? `Company day finished — ${r.failed} failed, ${r.passed} passed. Not live.`
                    : `Company day passed ${r.passed} checks. Not live.`,
                );
              })
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Running company day…" : "Run company day"}
        </Button>
      </Card>

      {companyDay ? (
        <div className="mb-8 space-y-6">
          <p className="text-sm text-muted">
            {new Date(companyDay.at).toLocaleString("en-IN")} · {companyDay.passed} passed ·{" "}
            {companyDay.failed} failed · local only
          </p>
          <div className="space-y-2">
            {companyDay.steps.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {s.seat} · {ROLE_LABEL[s.role]}
                  </p>
                  <p>{s.action}</p>
                  <p className="text-xs text-muted">{s.detail}</p>
                </div>
                <Status value={s.ok ? "approved" : "fail"} />
              </div>
            ))}
          </div>
          <div>
            <h2 className="mb-3 font-display text-2xl">UI notes from the desks</h2>
            {companyDay.ux.length === 0 ? (
              <p className="text-sm text-muted">No UI notes this run.</p>
            ) : (
              <ul className="space-y-2">
                {companyDay.ux.map((n, i) => (
                  <li key={i} className="rounded-xl border border-line px-4 py-3 text-sm">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                      {n.seat} · {n.screen} · {n.severity}
                    </p>
                    <p className="mt-1">{n.issue}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <Card className="mb-6 p-5">
        <h2 className="font-display text-xl">Seats</h2>
        <ul className="mt-3 space-y-1 font-mono text-sm">
          {USERS.map((u) => (
            <li key={u.id}>
              {u.email} · {u.password} · {u.title}
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mb-3 font-display text-2xl">UAT scripts</h2>
      <ol className="mb-8 space-y-2">
        {[
          "MD Command: in 5–15s, say on track or needs a decision (queue strip + RAG).",
          "Approve a PO whose card shows selected quote · vendor · amount · vs N other quotes.",
          "Quotations: RFQ → compare → Select Active vendor → Create PO → Approvals.",
          "Engineer: Seal today’s diary once; second seal same device+date refuses.",
          "Select quote / PO against a non-Active vendor is refused.",
          "Documents: quarantine → four-eyes export → single-use grant; preview is watermarked.",
          "Capital: Remaining = Planned − JTD spent − Forecast; Baggad concept is not committed.",
          "Windows: npm run typecheck and npm run dev (with-app-env spawns vite with shell on win32).",
        ].map((s, i) => (
          <li key={i} className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            <span className="font-mono text-xs text-muted">{i + 1}.</span> {s}
          </li>
        ))}
      </ol>
      <h2 className="mb-3 font-display text-2xl">Phase coverage</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PHASES.map((p) => (
          <li key={p.id} className="rounded-md border border-line px-4 py-3 text-sm">
            Phase {p.id} · {p.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
