import type { AuditEvent, LeadScoreHistory } from "@/lib/types";

export const SCORE_BASELINE_MEAN = 62;

export function recentScoreMean(history: LeadScoreHistory[], n = 20) {
  const slice = history.slice(0, n);
  if (!slice.length) return 0;
  return Math.round(slice.reduce((s, h) => s + h.score, 0) / slice.length);
}

export function modelMix(history: LeadScoreHistory[]) {
  const mix: Record<string, number> = {};
  for (const h of history) mix[h.model] = (mix[h.model] ?? 0) + 1;
  return mix;
}

export function nativeScoreCount(history: LeadScoreHistory[]) {
  return history.filter((h) => /catboost/i.test(h.model)).length;
}

/** Stub for later model-drift monitoring. Flag if mean moves > 15 off seed. */
export function driftNote(history: LeadScoreHistory[]) {
  const mean = recentScoreMean(history);
  if (!history.length) return "No scores yet.";
  const delta = mean - SCORE_BASELINE_MEAN;
  if (Math.abs(delta) < 15) return `Score mean ${mean} · within band of seed baseline ${SCORE_BASELINE_MEAN}.`;
  return `Score mean ${mean} vs baseline ${SCORE_BASELINE_MEAN} (Δ${delta}). Drift watch — owner TODO to wire a real monitor.`;
}

export function salesAudit(audit: AuditEvent[]) {
  return audit.filter((a) =>
    /hold|booking|lead|commission|daily sales|ingest|re-scor|handover|inbound|assign|catboost|payout/i.test(a.action),
  );
}
