# Housing.com Account Manager — webhook request

Please POST new project enquiries to Atlas.

## URL

`POST https://<atlas-host>/api/ingest/housing`

## Auth (pick one)

1. `X-Atlas-Ingest-Secret: <secret we send separately>`
2. `X-Atlas-Signature: sha256=<HMAC-SHA256(secret, raw JSON body)>`

Optional: `Idempotency-Key: <id>`

## Sample payload

```json
{
  "id": "HS-4402",
  "lead_name": "N. Khan",
  "phone_number": "9988776655",
  "email": "n.khan@example.com",
  "project": "Kanakpura Residences",
  "project_code": "KPR-01",
  "budget_max": 9000000,
  "property_type": "flat",
  "message": "Clinic / shop also of interest"
}
```

## What we return

HTTP 200 `{ "ok": true, "queued": true, "eventId": "wh_…" }`  
Same `id` retried: `{ "ok": true, "duplicate": true }`.  
`401` auth. `400` missing lead_name / phone_number.

Atlas maps the payload, dedups on phone + project, scores, and parks the lead in pipeline.

## Contact

Atlas owner / Sales Manager. Local UAT only until go-live.
