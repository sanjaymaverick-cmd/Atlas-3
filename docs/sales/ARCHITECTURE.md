# Atlas Sales Command — architecture

**Local only · not live.** This host runs the Sales module inside Atlas 3 (Zustand + TanStack Start). The folder map and SQL below are the **replaceable contract** for a later Postgres / service cutover. Do not treat them as a second ERP.

## Tech stack (this host vs later)

| Layer | This host (shipped) | Later cutover (owner TODO) |
|---|---|---|
| Presentation | TanStack Start routes under `src/routes/app/sales*` | Same UI; swap data hooks |
| Services | `src/lib/sales/*` pure functions | Same modules as Nest/Go packages |
| Data | Zustand persist `atlas3-sales-v6` | PostgreSQL + JSONB (`docs/sales/0003_scores.sql`) |
| Scoring | Hybrid fallback; CatBoost native at `services/scoring` (`cat_features`, no OTS). Bound locally to `:8091`. | Same; override `VITE_SCORING_URL` |
| Integrations | inbound inbox + WhatsApp template registry | Live 99acres / MagicBricks / Housing / Meta / Google / WhatsApp Business / Razorpay / e-sign / telephony |
| Books | ERPNext at D:\ERPNext remains the books. Atlas never posts unless ERPNEXT_POSTING_ENABLED. | Same invariant |

## Roles

| Prompt name | Atlas seat | Email |
|---|---|---|
| Developer Admin | `owner` / `pm` | md@ / pd@ |
| In-house Sales | `sales` | sm@atlas.local |
| Third-Party Company Admin | `channel_admin` | ca@atlas.local |
| Agent | `channel` | ag@atlas.local |

Isolation: a third-party company never sees another firm’s holds, reports, or leads.

## Folder structure

```text
src/lib/sales/
  inventory.ts      # unit status machine + lock rules
  channel.ts        # daily report + company isolation
  ingest.ts         # IngestService interface + portal / webhook / email
  integrations.ts   # inbound event contract (WhatsApp, ads, pay, e-sign, telephony)
  observe.ts        # audit helpers + score-drift stub
  scoring.ts        # ScoreService interface (swap XGB / LGB / CatBoost)
  whatsapp.ts       # template registry, consent, quality-rating guard
  stages.ts         # New → … → Booked / Lost / Nurture
src/lib/sales-score.ts
src/lib/sales-seed.ts
src/lib/sales-scope.ts
src/routes/app/sales.tsx            # layout + Outlet
src/routes/app/sales.index.tsx      # command
src/routes/app/sales.inventory.tsx
src/routes/app/sales.channel.tsx    # Phase 2 — ship first
src/routes/app/sales.company.tsx    # company admin roster
src/routes/app/sales.pipeline.tsx
src/routes/app/sales.handover.tsx
src/routes/app/sales.analytics.tsx
src/routes/app/sales.integrations.tsx
src/routes/app/sales.whatsapp.tsx
src/routes/app/sales.people.tsx         # Customer 360°
docs/sales/0001_inventory_channel.sql
docs/sales/0002_leads_whatsapp.sql
```

## Lead Ingestion service

```ts
interface IngestRequest {
  projectId: string;
  name: string;
  phone: string;
  source: string;          // 99acres | magicbricks | housing | meta | google | website | walk-in | partner | email | webhook
  unit?: string;
  budget?: number;
  note?: string;
  partnerId?: string;
}
interface IngestResult {
  ok: boolean;
  leadId?: string;
  duplicateOf?: string;
  error?: string;
}
```

Events: ingest → score → audit. WhatsApp reply / call / brochure → re-score.

## AI Scoring service (swappable)

```ts
interface ScoreRequest {
  lead: { source; stage; budget; note; kind };
  unit?: { price };
  activities: { kind: string }[];
  model: "hybrid" | "xgboost" | "lightgbm" | "catboost";
}
interface ScoreResult {
  score: number;           // 0–100, calibrated
  band: "hot" | "warm" | "cold";
  reasons: string[];       // SHAP-style
  model: string;
  features: Record<string, number>;
}
```

CatBoost path uses native `cat_features` (no Ordered Target Statistics reimplementation). Bound locally at `services/scoring`. Hybrid is the fallback.

## Phases

1. **Shared foundation + inventory** — units, towers, status history, lock. Shipped.
2. **Third-party** — companies, agents, daily reports, holds, bookings, scorecards. Shipped first.
3. **Lead ingestion + pipeline + scoring skeleton** — portals as inbox, hybrid score. Shipped.
4. **Handover + advanced scoring + unified reporting** — OC/snags, model switch, analytics. Shipped as demo.
5. **Live connectors** — owner TODO (WhatsApp Business, Meta/Google Lead Ads, payment gateway, e-sign).

## First database migration

See `docs/sales/0001_inventory_channel.sql`. It is the inventory + third-party reporting core: projects already exist in Atlas; this adds towers, units, unit_status_history, companies, agents, daily_reports, holds, with indexes, soft deletes, and audit. **Not applied on this host** — runtime is Zustand. Apply only when Postgres is chosen at go-live.
