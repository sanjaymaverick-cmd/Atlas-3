# Atlas 3 — local only

Private real estate ERP. **Not live.** Run on this machine until UAT is signed.

Unpack into:

`D:\work Dir\Atlas 3`

## Run

```bat
cd "D:\work Dir\Atlas 3"
npm install
npm run dev
```

Open the URL the terminal prints (usually port 8080).

## Test accounts (local)

| Seat | Email | Password |
|------|--------|----------|
| Managing Director | md@atlas.local | AtlasLocal-MD |
| Project Director | pd@atlas.local | AtlasLocal-PD |
| Site Engineer | se@atlas.local | AtlasLocal-SE |
| Site Supervisor | sv@atlas.local | AtlasLocal-SV |
| Finance Lead | fl@atlas.local | AtlasLocal-FL |
| Commercial Manager | cm@atlas.local | AtlasLocal-CM |
| Sales Manager | sm@atlas.local | AtlasLocal-SM |
| Land & Legal | ll@atlas.local | AtlasLocal-LL |
| Document Controller | dc@atlas.local | AtlasLocal-DC |
| Stores / QS | st@atlas.local | AtlasLocal-ST |
| Channel agent (Pink City) | ag@atlas.local | AtlasLocal-AG |
| Channel company admin | ca@atlas.local | AtlasLocal-CA |
| UAT tester | test@atlas.local | AtlasLocal-UAT |

Do not use these on a public host.

## Sales Command (local)

Third-party portal first, in-house pipeline next. Inventory locks a unit on hold or booking. Commission accrues and never pays itself. Atlas never posts Tally.

| Phase | What |
|---|---|
| 1 Inventory | Units, towers, status history |
| 2 Third-party | Daily report → hold → book, company admin, scorecards |
| 3 Ingest + score | Portal inbox, hybrid GBDT-lite |
| 4 Handover + analytics | OC/snags, funnel, drift stub |

Scoring: CatBoost is bound on this host (`npm run scoring` → `http://127.0.0.1:8091`). Categoricals go through `cat_features` — Atlas does not re-implement Ordered Target Statistics. If that process is down, the UI falls back to hybrid. Override with `VITE_SCORING_URL`.

Connectors (99acres, MagicBricks, Housing, Meta, Google, WhatsApp, Razorpay, e-sign, telephony) are an **inbound inbox**, not live APIs.

WhatsApp: template registry (Utility vs Marketing), consent, quality-rating pause. Site-visit auto-sends confirm. Inbound replies re-score and can qualify. Business API is owner TODO.

Partner hold → booking waits in Approvals. Inventory stays locked until approved.

Architecture, ingest/score interfaces, and SQL contracts: `docs/sales/ARCHITECTURE.md`.

## After UAT

Go-live (passkeys, Vault/HSM, Aerovista/Acropolis restore drill, Tally live sync) is a separate decision. This copy is the local console only.
