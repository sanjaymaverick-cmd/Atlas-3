"""POST /score — CatBoost native. Body: { cat_features, categoricals, numerics }."""

from pathlib import Path

import numpy as np
from catboost import CatBoostClassifier, Pool
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

MODEL_PATH = Path(__file__).parent / "model.cbm"
CAT_FEATURES = ["source", "stage", "kind"]
NUMERICS = ["budget", "unit_price", "wa", "call", "brochure", "visit"]

app = FastAPI(title="Atlas CatBoost scoring")
model: CatBoostClassifier | None = None


class Payload(BaseModel):
    cat_features: list[str]
    categoricals: dict
    numerics: dict


def load():
    global model
    if MODEL_PATH.exists():
        m = CatBoostClassifier()
        m.load_model(str(MODEL_PATH))
        model = m


@app.on_event("startup")
def startup():
    load()


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_PATH.exists(), "cat_features": CAT_FEATURES}


@app.post("/score")
def score(body: Payload):
    if model is None:
        load()
    if model is None:
        raise HTTPException(status_code=503, detail="model.cbm missing — run train.py")
    cats = body.categoricals
    nums = body.numerics
    row = [
        cats.get("source", "unknown"),
        cats.get("stage", "inquiry"),
        cats.get("kind", "flat"),
        float(nums.get("budget") or 0),
        float(nums.get("unit_price") or 0),
        int(nums.get("wa") or 0),
        int(nums.get("call") or 0),
        int(nums.get("brochure") or 0),
        int(nums.get("visit") or 0),
    ]
    pool = Pool([row], cat_features=[0, 1, 2], feature_names=CAT_FEATURES + NUMERICS)
    proba = float(model.predict_proba(pool)[0][1])
    score = int(round(np.clip(proba, 0.02, 0.98) * 100))
    band = "hot" if score >= 70 else "warm" if score >= 45 else "cold"
    importances = model.get_feature_importance(pool, type="ShapValues")[0][:-1]
    names = CAT_FEATURES + NUMERICS
    shap = {names[i]: float(importances[i]) for i in range(len(names))}
    top = sorted(shap.items(), key=lambda kv: abs(kv[1]), reverse=True)[:4]
    reasons = [f"{k} {v:+.2f}" for k, v in top]
    return {
        "probability": proba,
        "score": score,
        "band": band,
        "top_reasons": reasons,
        "shap_values": shap,
        "algorithm": "catboost",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8091)
