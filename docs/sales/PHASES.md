# Atlas Sales — phases, stack, acceptance

**Local only · not live.** Runtime on this machine is Atlas 3 (TanStack Start + Zustand). PostgreSQL SQL under `docs/sales/` is the go-live contract. CatBoost is a **separate process** (`services/scoring`). Tally remains the books.

## Recommended tech stack

| Layer | This host | Go-live |
|---|---|---|
| UI | TanStack Start, React 19, Tailwind | Same |
| State | Zustand persist | Postgres + JSONB |
| Inventory lock | Optimistic status machine + refuse | `UPDATE … WHERE status = 'available' RETURNING` |
| Scoring | Hybrid rules + GBDT-lite | Native CatBoost (`cat_features`) |
| WhatsApp | Template registry + thread log | WhatsApp Business API |
| Auth | Local test seats | RBAC on server |

## Folder structure

```text
src/lib/sales/           inventory, channel, ingest, scoring, whatsapp, scorecard
src/routes/app/sales*    command, inventory, channel, company, pipeline, people, handover, analytics, inbound, whatsapp
services/scoring/        train.py, serve.py (CatBoost native)
docs/sales/0001_inventory_channel.sql   Phase 1
docs/sales/0002_leads_whatsapp.sql      Phase 2
docs/sales/0003_scores.sql              scoring_models + lead_scores
```

## Phase 1 — Foundation + third-party (shipped first)

**SQL:** `0001_inventory_channel.sql` — towers, units, status history, companies, agents, customers, daily reports, holds, bookings, commissions.

**On this host:** Channel desk, inventory lock, daily report (calls/visits/leads/holds/bookings/cancellations), hold → Approvals → booking, commission accrued, company admin, agent mobile layout, audit.

**Seats:** Developer Admin `md@`, Company Admin `ca@atlas.local`, Agent `ag@atlas.local`, Sales `sm@atlas.local`.

**Acceptance**

- [x] Unit cannot be held unless Available; second hold refused.
- [x] Channel hold refused until today’s daily report.
- [x] Partner hold→booking waits in Approvals; unit stays locked.
- [x] Pink City cannot see Desert Reach.
- [x] Commission accrues; Atlas does not pay / does not post Tally.
- [x] Customer master rows created on ingest and booking.
- [x] Audit on hold, book, report, invite.

## Phase 2 — Lead engine + scoring + basic pipeline (shipped)

**SQL:** `0002` + `0003`. Ingest, dedup (phone+project), hybrid score, CatBoost service seam, pipeline, 360, site visits.

**CatBoost:** `services/scoring` — `Pool(..., cat_features=[0,1,2])`. Atlas does **not** re-implement Ordered Target Statistics. Bind `VITE_SCORING_URL` when serving.

**POST /score** `{ cat_features, categoricals, numerics }` → `{ probability, score, band, top_reasons, shap_values }`.

**Acceptance**

- [x] Duplicate phone+project refused.
- [x] Score 0–100, band, probability, reasons, history + current_* on lead.
- [x] Re-score on WhatsApp / call / brochure / visit.
- [x] CatBoost path uses native `cat_features` when the service is up; hybrid otherwise.
- [x] Lead assigned only to an active agent (in-house, or same partner firm).
- [x] Native CatBoost queued on ingest / advance / rescore / CatBoost model switch.
- [x] Customer 360 reads the customer master, then hangs lead / booking / WhatsApp off that row.

## Phase 3 — Lifecycle + WhatsApp + unified reporting (shipped as local demo)

Handover (OC/snags/possession/society), booking docs, WhatsApp templates (Utility first), inbound inbox, analytics funnel, model-drift stub.

**Acceptance**

- [x] Possession blocked until snags closed and OC received (handover desk).
- [x] Utility templates have sequential variables + samples; marketing needs consent; low quality paused.
- [x] Site-visit schedule auto-sends utility confirm (log).
- [x] Unified funnel: third-party + in-house.
- [x] Convert / book opens a handover case for the unit.
- [x] Collection with remaining balance fires the `payment_due` template.
- [x] Convert with WhatsApp consent fires `document_request`.
- [x] Commission payouts from analytics send to Approvals only — Atlas never pays / never posts Tally.
- [x] Model monitor shows recent mean vs baseline, mix, and native CatBoost count.

## Main UI “endpoints” (this host)

| Path | Phase |
|---|---|
| `/app/sales/inventory` | 1 |
| `/app/sales/channel` | 1 |
| `/app/sales/company` | 1 |
| `/app/approvals` | 1 (hold booking) |
| `/app/sales/pipeline` | 2 |
| `/app/sales/people` | 2 (360) |
| `/app/sales/integrations` | 2 |
| `/app/sales/whatsapp` | 3 |
| `/app/sales/handover` | 3 |
| `/app/sales/analytics` | 3 |

Live portal APIs, WhatsApp Business, payment gateway, and trained CatBoost on this machine remain owner TODOs to **bind**, not to re-scaffold.
