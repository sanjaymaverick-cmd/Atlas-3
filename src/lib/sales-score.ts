import type { InventoryUnit, Lead, LeadActivity, ScoreBand, ScoreModelKind } from "@/lib/types";

export interface ScoreContribution {
  feature: string;
  weight: number;
}

export interface ScoreResult {
  score: number;
  band: ScoreBand;
  probability: number;
  reasons: string[];
  model: string;
  contributions: ScoreContribution[];
  features: Record<string, number>;
  shapValues: Record<string, number>;
  raw: number;
  servedBy: "hybrid" | "catboost";
}

/** Empirical conversion priors — class imbalance handling for the local demo. */
const SOURCE_PRIOR: Record<string, number> = {
  "walk-in": 0.34,
  website: 0.19,
  partner: 0.26,
  "99acres": 0.14,
  magicbricks: 0.13,
  housing: 0.12,
  meta: 0.08,
  google: 0.1,
};

const POSITIVE_PRIOR = 0.18;

const STAGE_ORD: Record<string, number> = {
  inquiry: 0,
  contacted: 0.4,
  qualified: 0.7,
  visit: 1,
  negotiation: 2,
  documentation: 3,
  handover: 4,
  won: 5,
  lost: -1,
  nurture: -0.5,
};

export function extractFeatures(
  lead: Pick<Lead, "source" | "stage" | "budget" | "note" | "kind">,
  unit?: InventoryUnit,
  activities: LeadActivity[] = [],
): Record<string, number> {
  const sourcePrior = SOURCE_PRIOR[lead.source] ?? 0.1;
  const budgetFit = unit && lead.budget ? clamp((lead.budget - unit.price) / Math.max(unit.price, 1), -1, 1) : 0;
  const budgetOk = unit && lead.budget ? (Math.abs(budgetFit) <= 0.2 ? 1 : 0) : lead.budget && lead.budget >= 5_000_000 ? 0.5 : 0;
  const intent = /west|3 bhk|car park|urgent|this month|clinic|loan/i.test(lead.note || "") ? 1 : 0;
  const wa = activities.filter((a) => /whatsapp|wa/i.test(a.kind)).length;
  const call = activities.filter((a) => /call/i.test(a.kind)).length;
  const brochure = activities.filter((a) => /brochure/i.test(a.kind)).length;
  const visitAct = activities.filter((a) => /visit/i.test(a.kind)).length;
  const stage = STAGE_ORD[lead.stage] ?? 0;
  return {
    sourcePrior,
    sourceTarget: sourcePrior,
    budgetFit,
    budgetOk,
    intent,
    wa: Math.min(wa, 5),
    call: Math.min(call, 8),
    brochure: Math.min(brochure, 3),
    visitAct: Math.min(visitAct, 3),
    stage,
    plot: lead.kind === "plot" ? 1 : 0,
    shop: lead.kind === "shop" ? 1 : 0,
  };
}

/**
 * Hybrid scorer on this host: hard rules + calibrated GBDT-lite.
 * CatBoost is not re-implemented here — see `scoring.ts` / `services/scoring`.
 */
export function scoreLead(
  lead: Pick<Lead, "source" | "stage" | "budget" | "note" | "kind">,
  unit?: InventoryUnit,
  activities: LeadActivity[] = [],
  _model: ScoreModelKind = "hybrid",
): ScoreResult {
  const f = extractFeatures(lead, unit, activities);
  const contrib: ScoreContribution[] = [];

  let rules = 38;
  const srcPts = Math.round((f.sourcePrior - 0.1) * 80);
  rules += srcPts;
  contrib.push({ feature: `Source ${lead.source}`, weight: srcPts });

  if (lead.stage === "lost") {
    return pack(8, "cold", 0.05, ["Lead marked lost"], contrib, f, { lost: -30 }, 8);
  }
  if (f.stage >= 2) {
    rules += 14;
    contrib.push({ feature: "Late-funnel stage", weight: 14 });
  } else if (f.stage >= 1 || f.visitAct > 0) {
    rules += 9;
    contrib.push({ feature: "Site visit signal", weight: 9 });
  }

  if (unit && lead.budget) {
    if (f.budgetOk === 1) {
      rules += 14;
      contrib.push({ feature: "Budget matches unit", weight: 14 });
    } else {
      rules -= 12;
      contrib.push({ feature: "Budget off unit price", weight: -12 });
    }
  } else if (lead.budget && lead.budget >= 5_000_000) {
    rules += 6;
    contrib.push({ feature: "Budget declared", weight: 6 });
  }

  if (f.intent) {
    rules += 6;
    contrib.push({ feature: "Intent language in notes", weight: 6 });
  }

  let ml = 32;
  ml += f.sourceTarget * 36;
  ml += f.budgetOk * 16;
  ml += f.stage * 5;
  ml += f.wa * 5;
  ml += f.call * 3;
  ml += f.brochure * 4;
  ml += f.visitAct * 7;
  ml += f.plot * 3;
  if (f.wa) contrib.push({ feature: "WhatsApp replies", weight: f.wa * 5 });
  if (f.call) contrib.push({ feature: "Call engagement", weight: f.call * 3 });
  if (f.brochure) contrib.push({ feature: "Brochure views", weight: f.brochure * 4 });

  const raw = 0.42 * rules + 0.58 * ml;
  const z = (raw - 48) / 14;
  const p = 1 / (1 + Math.exp(-z));
  const mixed = 0.85 * p + 0.15 * (POSITIVE_PRIOR + 0.35);
  const probability = Math.max(0.02, Math.min(0.98, mixed));
  const score = Math.max(5, Math.min(98, Math.round(probability * 100)));
  const band: ScoreBand = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";
  const reasons = contrib
    .slice()
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 4)
    .map((c) => `${c.feature} ${c.weight >= 0 ? "+" : ""}${Math.round(c.weight)}`);
  reasons.push(`hybrid · calibrated ${band}`);
  const shapValues = Object.fromEntries(contrib.map((c) => [c.feature, c.weight]));
  return pack(score, band, probability, reasons.slice(0, 5), contrib, f, shapValues, raw);
}

export function bandTone(band: ScoreBand): "ok" | "warn" | "danger" {
  if (band === "hot") return "ok";
  if (band === "warm") return "warn";
  return "danger";
}

export function modelLabel(kind: ScoreModelKind) {
  if (kind === "hybrid") return "hybrid";
  if (kind === "xgboost") return "xgboost";
  if (kind === "lightgbm") return "lightgbm";
  return "catboost";
}

function pack(
  score: number,
  band: ScoreBand,
  probability: number,
  reasons: string[],
  contributions: ScoreContribution[],
  features: Record<string, number>,
  shapValues: Record<string, number>,
  raw: number,
): ScoreResult {
  return {
    score,
    band,
    probability,
    reasons,
    model: "hybrid",
    contributions,
    features,
    shapValues,
    raw,
    servedBy: "hybrid",
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
