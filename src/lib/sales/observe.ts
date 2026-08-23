import type { AuditEvent, LeadScoreHistory } from "@/lib/types";

const BASELINE_MEAN = 62;

export function recentScoreMean(history: LeadScoreHistory[], n = 20) {
  const slice = history.slice(0, n);
  if (!slice.length) return 0;
  return Math.round(slice.reduce((s, h) => s + h.score, 0) / slice.length);
}

/** Stub for later model-drift monitoring. Flag if mean moves > 15 off seed. */
export function driftNote(history: LeadScoreHistory[]) {
  const mean = recentScoreMean(history);
  if (!history.length) return "No scores yet.";
  const delta = mean - BASELINE_MEAN;
  if (Math.abs(delta) < 15) return `Score mean ${mean} · within band of seed baseline ${BASELINE_MEAN}.`;
  return `Score mean ${mean} vs baseline ${BASELINE_MEAN} (Δ${delta}). Drift watch — owner TODO to wire a real monitor.`;
}

export function salesAudit(audit: AuditEvent[]) {
  return audit.filter((a) =>
    /hold|booking|lead|commission|daily sales|ingest|re-scor|handover|inbound/i.test(a.action),
  );
}
