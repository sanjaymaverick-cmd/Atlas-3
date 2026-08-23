# Atlas CatBoost scoring service

Native CatBoost. Categoricals go through `cat_features`. This process does **not** re-implement Ordered Target Statistics.

Atlas on this host calls `http://127.0.0.1:8091` when CatBoost is the active model. Override with `VITE_SCORING_URL`. Unreachable → hybrid.

```bash
npm run scoring
```

Or:

```bash
cd services/scoring
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python train.py
.venv\Scripts\python serve.py
```
