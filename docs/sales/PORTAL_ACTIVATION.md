# Activate 99acres, MagicBricks, Housing.com

**Local only · not live.** Webhooks are bound on this host. Atlas never posts Tally. CatBoost is unchanged (`cat_features` only).

## What is live on this machine

| Portal | Endpoint | Adapter |
|---|---|---|
| 99acres | `POST /api/ingest/99acres` | `src/lib/sales/adapters/acres.ts` |
| MagicBricks | `POST /api/ingest/magicbricks` | `src/lib/sales/adapters/magicbricks.ts` |
| Housing.com | `POST /api/ingest/housing` | `src/lib/sales/adapters/housing.ts` |
| Email fallback | `POST /api/ingest/email` | `src/lib/sales/adapters/email.ts` |

Auth: header `X-Atlas-Ingest-Secret` (default `atlas-local-ingest-2026`) or HMAC `X-Atlas-Signature`. Override with env `ATLAS_INGEST_SECRET` (not a `VITE_` var).

Flow: verify → adapt → journal (idempotent) → Sales UI pulls journal → existing `ingestLead` (dedup + score + pipeline).

## Owner steps

1. Keep Atlas running (`npm run dev`). Scoring may run (`npm run scoring`) but is not required for ingest.
2. Open **Inbound** (`/app/sales/integrations`) as Sales Manager.
3. Copy the three webhook URLs and the secret.
4. Send the markdown pack in `docs/sales/connectors/` to each Account Manager.
5. Ask them to POST one sample lead. Click **Send sample** on Inbound to prove the path without waiting on the portal.
6. Confirm the lead on **Pipeline** (scored, not duplicated on retry).
7. For go-live: point `<atlas-host>` at the public URL, set `ATLAS_INGEST_SECRET` to a new value, and rotate what you sent the AMs.

## Email fallback

If a portal cannot webhook, forward the plain-text lead alert into **Inbound → Parse email**, or POST JSON `{ "subject", "from", "body" }` to `/api/ingest/email` with the same secret. The parser reads `Name:` / `Phone:` lines and still calls `IngestRequest`.

## Still designed-only

Meta Lead Ads, Google Lead Forms, WhatsApp Business API, Razorpay, e-sign, telephony.
