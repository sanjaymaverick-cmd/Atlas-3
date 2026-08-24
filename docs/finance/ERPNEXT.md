# Atlas 3 — ERPNext books (Option B)

**Local only · not live.** Atlas is operations. ERPNext is books of record.

| | |
|---|---|
| Upstream | https://github.com/frappe/erpnext |
| Install | **`D:\ERPNext` only** |
| Company | **MOCK ATLAS3 LLP** |
| Link | REST (`ERPNEXT_URL` + API key/secret) |
| Posting | **Off** (`ERPNEXT_POSTING_ENABLED=false`) |

Atlas never vendors ERPNext. Do not clone frappe/erpnext into the Atlas tree. Do not rebuild Atlas on Frappe.

## Why a sibling

Tally was the previous books seam (XML on :9000). The locked architecture is **API integration**: Atlas keeps sales, site, channel, inventory, scoring. ERPNext holds GL / journals. If ERPNext is down or env is unset, Atlas still boots (same posture as CatBoost falling back to hybrid).

## Ports

| Process | Port |
|---------|------|
| Atlas | 8080 |
| CatBoost | 8091 |
| ERPNext | **8000** (override with `ERPNEXT_URL`) |

## Install

Windows steps: [`scripts/erpnext/install-notes.windows.md`](../../scripts/erpnext/install-notes.windows.md).

Short version:

1. Clone **frappe_docker** (or bench) into `D:\ERPNext`, not into Atlas.
2. Install the **erpnext** app from https://github.com/frappe/erpnext.
3. Create company **MOCK ATLAS3 LLP**.
4. Generate API key/secret for an integration user.
5. Set Atlas env (never `VITE_` — secrets stay server-side):

```
ERPNEXT_URL=http://127.0.0.1:8000
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=
ERPNEXT_COMPANY=MOCK ATLAS3 LLP
ERPNEXT_POSTING_ENABLED=false
```

Template: `scripts/erpnext/.env.example`. Copy to `scripts/erpnext/.env` (gitignored) or export in the shell before `npm run dev`.

## Phases

**Phase 1 (this cutover)** — read / reconcile / health / “Atlas posted nothing”.  
**Phase 2 (controlled post)** — Finance desk only. Typed `AtlasJournalPost` (`src/lib/erpnext/journal-post.ts`). Default **off**.

### Controlled Journal Entry (Finance button)

Atlas never auto-posts from land, booking, PO, or CEO. Posting is an explicit Finance action.

Payload (`AtlasJournalPost`):

| Field | Rule |
|-------|------|
| `sourceId` | Required. Idempotency key. Title becomes `ATLAS-OPS {sourceId}`. |
| `company` | Allowlist: MOCK ATLAS3 LLP, SATYAM BUILDCOM, SATYAM CONSTRUCTION, MGB PRIME ESTATES LLP |
| `postingDate` | `YYYY-MM-DD` |
| `lines` | ≥2. Each line amount > 0. Debit XOR credit. Totals balanced. Rounded to 2 decimals (INR). Posted as `debit_in_account_currency` / `credit_in_account_currency`. |

`Check journal` → `action: validate` (works even when posting is off).  
`Post to ERPNext` → `action: post`. Refuses while `ERPNEXT_POSTING_ENABLED` is false. When the flag is on and ERPNext is down, Atlas returns a **mock** `MOCK-JE-{sourceId}` so the path can be proven without a live desk. Same `sourceId` returns the existing JE name.

ERPNext: leaf accounts, cost centre on P&L, party on AR/AP, open fiscal period. Atlas **submits** the JE (`frappe.client.submit`) so GL posts. A draft alone is not the ledger.

```
POST /api/books
{ "action": "post", "sourceId": "ops-1", "company": "SATYAM BUILDCOM", "postingDate": "2026-08-24",
  "lines": [ { "account": "Construction Expenses - SBC", "debit": 1000 }, { "account": "Cash - SBC", "credit": 1000 } ] }
```

## Verify from Atlas

```bat
cd "D:\work Dir\Atlas 3"
npm run dev
node scripts\erpnext\smoke.mjs
```

Or POST `http://127.0.0.1:8080/api/books` with `{ "action": "health" }`.

| Atlas response | Meaning |
|----------------|---------|
| `books backend not configured` | Env unset — Atlas is fine |
| ERPNext HTTP / timeout | Unreachable — Atlas is fine, posting still off |
| `MOCK ATLAS3 LLP reachable` | Ready to reconcile |

Finance desk title: **Company accounts (ERPNext)**. Site seats never see it.

## Trial attestation

`scripts/trial/probes/erpnext-baseline.mjs` reads journal rows. Atlas-originated posts would be tagged `ATLAS-OPS`. Count must stay 0 while posting is off.

## Tally

The Tally XML transport (`/api/tally`, `scripts/tally-xml.mjs` as a live backend) is retired. `/api/tally` returns 410 and points at `/api/books`.
