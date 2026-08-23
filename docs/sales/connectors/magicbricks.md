# MagicBricks Account Manager — webhook request

Please POST new project enquiries to Atlas.

## URL

`POST https://<atlas-host>/api/ingest/magicbricks`

## Auth (pick one)

1. `X-Atlas-Ingest-Secret: <secret we send separately>`
2. `X-Atlas-Signature: sha256=<HMAC-SHA256(secret, raw JSON body)>`

Optional: `Idempotency-Key: <LeadId>`

## Sample payload

```json
{
  "LeadId": "MB-7781",
  "Name": "A. Gupta",
  "Mobile": "9123456780",
  "Email": "a.gupta@example.com",
  "ProjectName": "Kanakpura Residences",
  "ProjectId": "KPR-01",
  "City": "Jaipur",
  "Budget": 7500000,
  "PropertyType": "Apartment",
  "Comment": "Needs extra car park"
}
```

## What we return

HTTP 200 `{ "ok": true, "queued": true, "eventId": "wh_…" }`  
Retry of the same LeadId: `{ "ok": true, "duplicate": true }`.  
`401` auth. `400` missing Name/Mobile.

Lead is ingested, de-duplicated on phone + project, scored, and shown on the Atlas pipeline.

## Contact

Atlas owner / Sales Manager. Local UAT only until go-live.
