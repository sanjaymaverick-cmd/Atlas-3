import type { InventoryUnit, Lead, LeadActivity, ScoringModel } from "@/lib/types";
import { scoreLead as runHybrid, extractFeatures, modelLabel, bandTone } from "@/lib/sales-score";
import type { ScoreResult } from "@/lib/sales-score";

/** Categoricals CatBoost must receive via cat_features — never target-encoded here. */
export const CAT_FEATURES = ["source", "stage", "kind"] as const;

export const FEATURE_LIST = [
  "source",
  "stage",
  "kind",
  "budget",
  "unit_price",
  "wa",
  "call",
  "brochure",
  "visit",
] as const;

export interface ScoreRequest {
  lead: Pick<Lead, "source" | "stage" | "budget" | "note" | "kind">;
  unit?: InventoryUnit;
  activities?: LeadActivity[];
  model?: ScoringModel;
  triggerType?: string;
  triggerDetail?: string;
}

export type { ScoreResult };

export interface CatBoostPayload {
  cat_features: typeof CAT_FEATURES;
  categoricals: { source: string; stage: string; kind: string };
  numerics: {
    budget: number;
    unit_price: number;
    wa: number;
    call: number;
    brochure: number;
    visit: number;
  };
}

export function catBoostPayload(req: ScoreRequest): CatBoostPayload {
  const acts = req.activities ?? [];
  return {
    cat_features: CAT_FEATURES,
    categoricals: {
      source: req.lead.source || "unknown",
      stage: req.lead.stage || "inquiry",
      kind: req.lead.kind || "flat",
    },
    numerics: {
      budget: req.lead.budget ?? 0,
      unit_price: req.unit?.price ?? 0,
      wa: acts.filter((a) => /whatsapp|wa/i.test(a.kind)).length,
      call: acts.filter((a) => /call/i.test(a.kind)).length,
      brochure: acts.filter((a) => /brochure/i.test(a.kind)).length,
      visit: acts.filter((a) => /visit/i.test(a.kind)).length,
    },
  };
}

const LOCAL_SCORING = "http://127.0.0.1:8091";

function scoringUrl() {
  try {
    const fromEnv = (import.meta as { env?: { VITE_SCORING_URL?: string } }).env?.VITE_SCORING_URL;
    return (fromEnv && fromEnv.trim()) || LOCAL_SCORING;
  } catch {
    return LOCAL_SCORING;
  }
}

/**
 * Scoring service.
 * CatBoost is native (cat_features) when VITE_SCORING_URL is set.
 * This host never re-implements Ordered Target Statistics.
 */
export async function score(req: ScoreRequest): Promise<ScoreResult> {
  const algo = req.model?.algorithm ?? req.model?.kind ?? "hybrid";
  if (algo === "catboost") {
    const url = scoringUrl();
    if (url) {
      const native = await scoreCatBoostNative(url, req);
      if (native) return native;
    }
  }
  return runHybrid(req.lead, req.unit, req.activities ?? [], "hybrid");
}

async function scoreCatBoostNative(base: string, req: ScoreRequest): Promise<ScoreResult | null> {
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(catBoostPayload(req)),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      probability: number;
      score?: number;
      band?: ScoreResult["band"];
      top_reasons?: string[];
      shap_values?: Record<string, number>;
    };
    const probability = Math.max(0.02, Math.min(0.98, Number(body.probability) || 0));
    const score = body.score ?? Math.round(probability * 100);
    const band = body.band ?? (score >= 70 ? "hot" : score >= 45 ? "warm" : "cold");
    const shapValues = body.shap_values ?? {};
    const reasons =
      body.top_reasons ??
      Object.entries(shapValues)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 4)
        .map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${Math.round(v)}`);
    return {
      score,
      band,
      probability,
      reasons,
      model: "catboost",
      contributions: Object.entries(shapValues).map(([feature, weight]) => ({ feature, weight })),
      features: {},
      shapValues,
      raw: probability * 100,
      servedBy: "catboost",
    };
  } catch {
    return null;
  }
}

export { extractFeatures, modelLabel, bandTone, runHybrid as scoreLead };

export function scoreSync(req: ScoreRequest): ScoreResult {
  return runHybrid(req.lead, req.unit, req.activities ?? [], "hybrid");
}
