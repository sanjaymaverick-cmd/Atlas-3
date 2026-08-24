import type { Project, PurchaseOrder } from "@/lib/types";

const OPEN_PO = new Set(["submitted", "review", "approved", "execution"]);

export function openCommitments(projectId: string, pos: PurchaseOrder[]) {
  return pos.filter((p) => p.projectId === projectId && OPEN_PO.has(p.status)).reduce((s, p) => s + p.amount, 0);
}

/** Remaining ≈ Planned − JTD spent − Forecast (not ERPNext). Concept rows are not committed capital. */
export function capitalRow(p: Project, pos: PurchaseOrder[]) {
  const planned = p.budget;
  const jtd = p.spent;
  const forecast = p.forecast ?? 0;
  const committed = p.concept ? 0 : jtd;
  const remaining = planned - jtd - forecast;
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    concept: p.concept,
    planned,
    jtd,
    committed,
    open: openCommitments(p.id, pos),
    forecast,
    remaining,
  };
}
