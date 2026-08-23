# Atlas CatBoost scoring service

Native CatBoost. Categoricals go through `cat_features`. This process does **not** re-implement Ordered Target Statistics.

This host’s UI falls back to hybrid scoring until `VITE_SCORING_URL` points here.

```bash
cd services/scoring
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python train.py
.venv\Scripts\python serve.py
```

Then set `VITE_SCORING_URL=http://127.0.0.1:8091` for the Atlas 3 app.
