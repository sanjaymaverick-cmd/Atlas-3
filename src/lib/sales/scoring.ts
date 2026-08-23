import type { InventoryUnit, Lead, LeadActivity, ScoreModelKind } from "@/lib/types";
import { scoreLead as run, extractFeatures, modelLabel, bandTone } from "@/lib/sales-score";
import type { ScoreResult } from "@/lib/sales-score";

export interface ScoreRequest {
  lead: Pick<Lead, "source" | "stage" | "budget" | "note" | "kind">;
  unit?: InventoryUnit;
  activities?: LeadActivity[];
  model?: ScoreModelKind;
}

export type { ScoreResult };

/** Swap point: replace `run` with an XGBoost / LightGBM / CatBoost server. */
export function score(req: ScoreRequest): ScoreResult {
  return run(req.lead, req.unit, req.activities ?? [], req.model ?? "hybrid");
}

export { extractFeatures, modelLabel, bandTone, run as scoreLead };
