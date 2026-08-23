# 99acres Account Manager — webhook request

Please POST new project enquiries to Atlas. Local UAT host; production host is the same path on the go-live domain.

## URL

`POST https://<atlas-host>/api/ingest/99acres`

## Auth (pick one)

1. Header `X-Atlas-Ingest-Secret: <secret we send separately>`
2. HMAC: `X-Atlas-Signature: sha256=<hex>` where hex = HMAC-SHA256(secret, **raw JSON body**)

Optional: `Idempotency-Key: <your lead id>` so retries do not double-create.

## Sample payload

```json
{
  "lead_id": "AC-10021",
  "name": "R. Sharma",
  "mobile": "9876543210",
  "email": "r.sharma@example.com",
  "project_name": "Kanakpura Residences",
  "project_id": "KPR-01",
  "city": "Jaipur",
  "requirement": "3 BHK",
  "budget": 8200000,
  "comments": "West stack, this month"
}
```

## What we return

```json
{ "ok": true, "queued": true, "eventId": "wh_…", "ingest": { "projectId": "p_kanak", "name": "R. Sharma", "phone": "9876543210", "source": "99acres" } }
```

Same lead retried (same `lead_id` or idempotency key) returns `{ "ok": true, "duplicate": true }` with HTTP 200.

`401` missing/wrong secret. `400` missing name/mobile.

Atlas then dedups on phone + project, scores the lead, and parks it in the in-house pipeline.

## Contact

Atlas owner / Sales Manager. Do not send production customer lists to the local UAT host.
