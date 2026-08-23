"""Train a tiny CatBoost classifier. Categoricals: source, stage, kind."""

from pathlib import Path

import numpy as np
from catboost import CatBoostClassifier, Pool

CAT_FEATURES = ["source", "stage", "kind"]
NUMERICS = ["budget", "unit_price", "wa", "call", "brochure", "visit"]
OUT = Path(__file__).parent / "model.cbm"

SOURCES = ["walk-in", "website", "partner", "99acres", "magicbricks", "housing", "meta", "google"]
STAGES = ["inquiry", "contacted", "qualified", "visit", "negotiation", "documentation"]
KINDS = ["flat", "shop", "plot"]


def synth(n=800, seed=7):
    rng = np.random.default_rng(seed)
    rows = []
    y = []
    for _ in range(n):
        source = SOURCES[int(rng.integers(0, len(SOURCES)))]
        stage = STAGES[int(rng.integers(0, len(STAGES)))]
        kind = KINDS[int(rng.integers(0, len(KINDS)))]
        budget = float(rng.uniform(2e6, 1.5e7))
        price = float(rng.uniform(2e6, 1.5e7))
        wa, call, brochure, visit = (int(rng.integers(0, 4)) for _ in range(4))
        fit = abs(budget - price) / max(price, 1) < 0.2
        p = 0.12 + 0.18 * (source == "walk-in") + 0.22 * fit + 0.08 * visit + 0.05 * wa
        y.append(1 if rng.random() < min(0.85, p) else 0)
        rows.append([source, stage, kind, budget, price, wa, call, brochure, visit])
    return rows, y


def main():
    X, y = synth()
    pool = Pool(X, y, cat_features=[0, 1, 2], feature_names=CAT_FEATURES + NUMERICS)
    model = CatBoostClassifier(
        iterations=80,
        depth=4,
        loss_function="Logloss",
        auto_class_weights="Balanced",
        verbose=False,
        random_seed=7,
    )
    model.fit(pool)
    model.save_model(str(OUT))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
