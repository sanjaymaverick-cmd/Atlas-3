import { createFileRoute } from "@tanstack/react-router";
import { EntityTable } from "@/components/entity-table";
import { GateBanner } from "@/components/gate-banner";
import { PageHeader } from "@/components/page-header";
import { Status } from "@/components/status";
import { capitalRow } from "@/lib/capital";
import { useAtlas } from "@/lib/store";
import { inr } from "@/lib/utils";

export const Route = createFileRoute("/app/capital")({ component: Capital });

function Capital() {
  const { projects, entityId, projectId, pos } = useAtlas();
  const list = projects.filter((p) => p.entityId === entityId && (projectId === "all" || p.id === projectId));
  const rows = list.map((p) => capitalRow(p, pos));
  const committed = rows.filter((r) => !r.concept);
  const planSum = committed.reduce((s, r) => s + r.planned, 0);
  const jtdSum = committed.reduce((s, r) => s + r.jtd, 0);
  const fcSum = committed.reduce((s, r) => s + r.forecast, 0);
  const remSum = committed.reduce((s, r) => s + r.remaining, 0);

  return (
    <div>
      <PageHeader
        kicker="Capital planning"
        title="Plan vs reality"
        description="Remaining ≈ Planned − JTD spent − Forecast. Concept/land is not committed until acquire. Atlas never posts this to Tally."
      />
      <GateBanner>
        Statutory books stay in Tally. These figures are an operations view for the MD — not a voucher.
      </GateBanner>
      <EntityTable columns={["Project", "Planned", "JTD spent", "Open commitments", "Forecast", "Remaining"]}>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-line last:border-0">
            <td className="px-4 py-3">
              <p className="font-medium">
                {r.code} · {r.name}
              </p>
              {r.concept ? <p className="text-xs text-muted">Concept — planned only; not in committed totals</p> : null}
            </td>
            <td className="px-4 py-3 tabular-nums">{inr(r.planned, true)}</td>
            <td className="px-4 py-3 tabular-nums">{inr(r.jtd, true)}</td>
            <td className="px-4 py-3 tabular-nums">{inr(r.open, true)}</td>
            <td className="px-4 py-3 tabular-nums">{inr(r.forecast, true)}</td>
            <td className="px-4 py-3 tabular-nums">
              {inr(r.remaining, true)}{" "}
              <Status value={r.remaining < 0 ? "fail" : r.concept ? "review" : "approved"} />
            </td>
          </tr>
        ))}
        <tr className="border-t border-ink/20 font-medium">
          <td className="px-4 py-3">Committed total (ex-concept)</td>
          <td className="px-4 py-3 tabular-nums">{inr(planSum, true)}</td>
          <td className="px-4 py-3 tabular-nums">{inr(jtdSum, true)}</td>
          <td className="px-4 py-3">—</td>
          <td className="px-4 py-3 tabular-nums">{inr(fcSum, true)}</td>
          <td className="px-4 py-3 tabular-nums">{inr(remSum, true)}</td>
        </tr>
      </EntityTable>
      <p className="mt-3 text-xs text-muted">
        Forecast is a 12-month remaining-work allowance on the project (seed). Optional monthly cells can be added
        later — owner decision, not a funding-source module.
      </p>
    </div>
  );
}
